# Modelo de datos — Firebase Realtime Database (MVP demo)

Todo vive en RTDB. Sin Cloud Functions, sin Firestore, sin servicios de pago.
Toda la lógica (login, evaluación de signos, generación de alertas, stock) se ejecuta
en el cliente Flutter.

## 1. Mapa de nodos

```
/config
  /umbrales          → reglas de "qué es crítico" (editables en vivo)
  /app               → maxIntentosPin, nombre del hospital
/usuarios/{uid}      → personal clínico y de gestión (US 1.1, 1.2)
/pacientes/{patientId}
  /signosActuales    → último set de signos (embebido, 1 sola lectura)
/signosHistorial/{patientId}/{pushId}   → serie temporal para gráficas
/inventario/{medId}  → catálogo + stock de farmacia (US 4.1)
/ordenes/{ordenId}   → prescripción = 1 dosis programada (US 4.2 / MAR)
/alertas/{alertaId}  → historial y feed en tiempo real (US 5.1)
```

Seis nodos raíz, todos planos. Cada uno se puede vaciar o editar desde la consola de
Firebase sin romper a los demás.

## 2. Entidades

### `/usuarios/{uid}`
Clave: id arbitrario legible (`u_med_01`). Un solo nodo cubre los dos métodos de login.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | |
| `rol` | `medico` \| `enfermero` \| `administrador` \| `farmaceutico` | coincide con `UserRole` |
| `activo` | bool | desactivar = `false` (US 1.2, nunca se borra) |
| `codigo` | string | solo clínicos — `MED-001`, `ENF-001` |
| `pin` | string(6) | solo clínicos, **en claro** (demo) |
| `email`, `password` | string | solo administrador / farmacéutico |
| `bloqueado` | bool | `true` tras 3 PIN fallidos |
| `intentosFallidos` | int | contador que incrementa el cliente |

### `/pacientes/{patientId}`
Clave = `patientId` = **el contenido del QR** (`000-2204-B`). Sin nodo de QR aparte:
la pantalla dibuja el QR a partir de la clave y el escáner navega a `/paciente/{valorLeído}`.

Campos: `nombre`, `edad`, `habitacion`, `cama`, `diagnosticos[]`, `estado`
(`critico|atencion|estable`), `medicoAsignadoId` + `medicoAsignado`, `activo`,
`creadoPor` (auditoría US 2.1), `creadoEn`, y `signosActuales` embebido
(`hr`, `spo2`, `sistolica`, `diastolica`, `temperatura`, `frecuenciaRespiratoria`,
`actualizadoEn`, `origen`).

Embeber los signos actuales es la decisión clave: la lista de pacientes y el dashboard
se alimentan de **un solo listener** sobre `/pacientes`, y el color de estado ya viene
calculado.

### `/signosHistorial/{patientId}/{pushId}`
Append-only con `push()`. Mismo shape que `signosActuales` + `registradoEn`.
Solo se lee al abrir el detalle del paciente (`limitToLast(20)`).

### `/inventario/{medId}`
`nombre`, `presentacion`, `dosisSugerida`, `via`, `stock`, `stockMinimo`,
`actualizadoEn`, `actualizadoPor`. El buscador de farmacia filtra en memoria; +/- stock
usa una transacción sobre `/inventario/{medId}/stock`.

### `/ordenes/{ordenId}`
**Una orden = una dosis programada.** Evita un segundo nivel de "administraciones" y
mapea 1:1 con el modelo `Medication` que ya existe en la app.

`pacienteId` + `pacienteNombre` + `habitacion` (denormalizados),
`medicamentoId` + `medicamento` + `dosis` + `via` (denormalizados del inventario),
`horaProgramada`, `estado` (`pendiente|administrada|diferida`),
`prescritoPor`/`prescritoEn`, `administradoPor`/`administradoEn`.

Denormalizar nombre de paciente y de medicamento permite pintar la lista de "Dosis
pendientes" del enfermero sin ningún join.

### `/alertas/{alertaId}`
`pacienteId`, `pacienteNombre`, `habitacion`, `tipo` (`spo2|hr|temperatura|sistolica`),
`severidad` (`critica|atencion`), `valor`, `mensaje`, `creadaEn`, `creadaPor`,
`atendida`, `atendidaPor`, `atendidaEn`.

### `/config/umbrales`
Los límites viven en la BD, no en el código: durante la demo se pueden ajustar desde la
consola de Firebase para forzar (o evitar) una alerta.

## 3. Relaciones

- `usuarios.uid` → `pacientes.creadoPor`, `pacientes.medicoAsignadoId`,
  `ordenes.prescritoPor`, `ordenes.administradoPor`, `alertas.atendidaPor`.
- `pacientes.id` → `signosHistorial/{id}`, `ordenes.pacienteId`, `alertas.pacienteId`.
- `inventario.medId` → `ordenes.medicamentoId`.

Todas las relaciones son por id + copia del texto que la UI necesita mostrar.
No hay lecturas anidadas en ninguna pantalla.

## 4. Lógica que se mueve al cliente

| Antes (nota técnica original) | Ahora |
|---|---|
| Custom Token vía Cloud Function (US 1.1) | El login lee `/usuarios` con `orderByChild('codigo').equalTo(codigo)`, compara `pin`, incrementa `intentosFallidos` y pone `bloqueado=true` al llegar a 3. Gestión: mismo query por `email`. Sin Firebase Auth. |
| Crear usuario en Auth sin cerrar sesión del admin (US 1.2) | Un `push()` a `/usuarios`. El problema desaparece porque no hay Firebase Auth. |
| Evaluación de criticidad en backend (US 5.1) | El **Modo Simulador**, al pulsar "Emitir": (1) `update` de `pacientes/{id}/signosActuales`, (2) `push` a `signosHistorial/{id}`, (3) compara contra `/config/umbrales`, (4) escribe `estado` en el paciente y (5) hace `push` a `/alertas` si cruzó un umbral. |
| `onSnapshot` de Firestore | `ref.onValue` de RTDB: los clínicos escuchan `/alertas` (`limitToLast(30)`) y muestran Snackbar rojo cuando entra un hijo nuevo con `atendida=false`. |

El Modo Simulador no requiere login: solo valida que exista `/pacientes/{patientId}`.

## 5. Cómo cargar la base

Consola de Firebase → Realtime Database → menú ⋮ → **Importar JSON** →
`firebase/rtdb_seed.json` (reemplaza la raíz completa).

Reglas: `firebase/database.rules.json` — abiertas (`.read`/`.write: true`) más
`.indexOn` para que los `orderByChild` no lancen warnings.

## 6. Capa de datos en Flutter

| Archivo | Rol |
|---|---|
| `lib/core/data/hospital_db.dart` | `kDatabaseUrl` + refs a cada nodo + helpers de parseo |
| `lib/core/data/vitals_rules.dart` | lee `/config/umbrales` y decide qué es crítico (US 5.1) |
| `lib/core/utils/models.dart` | modelos con `fromMap` por nodo |
| `lib/core/utils/providers.dart` | `StreamProvider` por nodo + vistas síncronas + escrituras |
| `lib/features/simulator/` | Modo Simulador: panel de signos + QR del paciente (US 3.1) |
| `lib/features/scanner/` | escáner de QR → expediente (US 3.2) |
| `lib/features/admin/` | alta y baja de usuarios (US 1.2) |
| `lib/features/pharmacy/` | inventario y ajuste de stock (US 4.1) |
| `lib/features/alerts/` | historial de alertas + `AlertWatcher` global (US 5.1) |

Cada nodo expone dos providers: el `StreamProvider` (`patientsStreamProvider`) para
quien necesite estados de carga/error, y un `Provider` síncrono
(`patientsProvider`) que devuelve lista vacía mientras carga, para que las pantallas
no tengan que manejar `AsyncValue`.

Las escrituras van en controladores dentro de `providers.dart`:
`PatientsController.admit`, `UsersController.create/setActive/unblock`,
`InventoryController.adjustStock`, `MedicationsController.prescribe/administer`,
`AlertsController.acknowledge` y `SimulatorController.emit`.

## 7. Navegación por rol

La barra inferior se arma en `MainShell.tabsFor(role)`:

| Rol | Pestañas |
|---|---|
| médico / enfermero | Inicio · Pacientes · Alertas · Escanear |
| administrador | Inicio · Usuarios · Pacientes · Alertas |
| farmacéutico | Inicio · Farmacia |

`AlertWatcher` envuelve el shell completo, así que el aviso rojo de alerta nueva
interrumpe en cualquier pantalla.

## 8. Credenciales de la demo

| Rol | Acceso |
|---|---|
| Administrador | `admin@hospital.demo` / `admin123` |
| Farmacéutico | `farmacia@hospital.demo` / `farmacia123` |
| Médico | `MED-001` / PIN `123456` |
| Enfermero | `ENF-001` / PIN `654321` |
| Simulador | patientId `000-2204-B` |

## 9. Recorrido sugerido de la demo

1. **Simulador** (dispositivo A, sin login) con `000-2204-B`.
2. **Médico** `MED-001` / `123456` (dispositivo B) → Escanear el QR del simulador →
   cae en el expediente.
3. En el simulador, bajar SpO₂ a 87 y **Emitir**: el paciente pasa a crítico y en el
   dispositivo B salta el Snackbar rojo. Queda en la pestaña Alertas.
4. Desde el expediente, **+ Nueva orden médica** (solo visible para el rol médico).
5. **Enfermero** `ENF-001` / `654321` → Inicio → Medicamentos → marcar la dosis:
   se guardan su ID y la hora en `/ordenes`.
6. **Farmacéutico** `farmacia@hospital.demo` / `farmacia123` → Farmacia → ajustar stock.
7. **Administrador** `admin@hospital.demo` / `admin123` → Usuarios → alta de un
   clínico: la app muestra el código y el PIN generados (no se pueden recuperar
   después). Con 3 PIN fallidos el usuario queda bloqueado y se desbloquea desde
   esta misma pantalla.
