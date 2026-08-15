# HospitOS — Historias de usuario

Requerimientos funcionales del prototipo y su estado real en el código.
Modelo de datos y nodos: [`firebase/MODELO-DATOS.md`](../firebase/MODELO-DATOS.md).

**Leyenda de estado:** ✅ implementado · ⚠️ implementado con desviación o parcial · ⛔ fuera de alcance

---

## 1. Resumen

| Épica | Tema | Historias | Estado |
|---|---|---|---|
| 1 | Autenticación unificada y gestión móvil | 2 | ✅ |
| 2 | Admisión de pacientes y expediente | 2 | ✅ |
| 3 | Simulación (smartwatch) y escáner en piso | 2 | ✅ |
| 4 | Farmacia y medicación simplificada | 2 | ⚠️ |
| 5 | Alertas críticas (in-app) | 1 | ⚠️ |

| Historia | Título | Rol | Ruta principal | Estado |
|---|---|---|---|---|
| US 1.1 | Pantalla de inicio de sesión híbrida | Todos | `/login` | ✅ |
| US 1.2 | Gestión de usuarios desde la app | Administrador | `/users` | ✅ |
| US 2.1 | Admisión Express Móvil | Médico / Admisión | `/admission` | ✅ |
| US 2.2 | Generación y visualización de QR | Personal clínico | `/patients/:id` | ✅ |
| US 3.1 | Acceso al Modo Simulador | Personal del hospital | `/simulator` | ✅ |
| US 3.2 | Escáner QR de pacientes | Médico / Enfermero | `/scan` | ✅ |
| US 4.1 | Inventario móvil de farmacia | Farmacéutico | `/inventory` | ✅ |
| US 4.2 | Prescripción y administración (MAR) | Médico / Enfermero | `/patients/:id`, `/medications` | ⚠️ |
| US 5.1 | Notificaciones y panel de alertas | Médico / Enfermero | `/alerts` | ⚠️ |

---

## 2. Épica 1 — Autenticación unificada y gestión móvil

### US 1.1 — Pantalla de inicio de sesión híbrida

> Como **usuario del sistema**, quiero **una única pantalla de acceso que me permita
> ingresar con mi método correspondiente**, para **entrar al sistema sin importar mi rol**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Dos pestañas: "Personal Clínico" (código + PIN de 6 dígitos) y "Gestión" (correo + contraseña) | ✅ | `login_screen.dart` |
| 2 | Al autenticar, enruta al panel correspondiente con navegación adaptativa según rol | ✅ | `MainShell.tabsFor()` |
| 3 | Bloqueo del acceso clínico tras 3 intentos fallidos de PIN | ✅ | `AuthNotifier.submit()` |

**Barra de navegación por rol**

| Rol | Pestañas |
|---|---|
| Médico / Enfermero | Inicio · Pacientes · Alertas · Escanear |
| Administrador | Inicio · Usuarios · Pacientes · Alertas |
| Farmacéutico | Inicio · Farmacia |

> **Desviación.** La nota técnica pedía Custom Tokens vía Cloud Functions. Como el
> proyecto no usa servicios de pago, la validación de código/PIN y de correo/contraseña
> se hace en el cliente contra el nodo `/usuarios`. No se usa Firebase Auth.

### US 1.2 — Gestión de usuarios desde la app

> Como **Administrador**, quiero **crear y desactivar usuarios desde un formulario
> integrado en la app**, para **controlar los accesos sin depender de una plataforma externa**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Lista de usuarios con botón flotante (FAB) "Nuevo Usuario" | ✅ | `users_screen.dart` |
| 2 | Formulario minimalista: nombre, rol y campos dinámicos según el rol | ✅ | `_NewUserSheet` |
| 3 | Correo para administrador/farmacia; código y PIN autogenerados para clínicos | ✅ | `UsersController.create()` |
| 4 | Restricción: cero carga de imágenes | ✅ | — |
| 5 | Desactivar sin borrar (bandera `activo`) | ✅ | `UsersController.setActive()` |

**Extra necesario:** el código y el PIN generados se muestran una sola vez al crear al
usuario. No quedan visibles en ningún otro lugar de la app, así que omitir ese paso
dejaría al usuario sin poder entrar. Se añadió también el desbloqueo manual de un
clínico que agotó sus 3 intentos.

> **Desviación.** No hace falta la Cloud Function que evitaba cerrar la sesión del
> administrador: sin Firebase Auth, crear un usuario es un `push()` a `/usuarios`.

---

## 3. Épica 2 — Admisión de pacientes y expediente

### US 2.1 — Admisión Express Móvil

> Como **Médico o Personal de Admisión**, quiero **registrar a un paciente nuevo
> mediante un formulario corto**, para **crear su expediente rápidamente**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Campos: nombre, edad, cuarto, cama, diagnóstico principal | ✅ | `admission_screen.dart` |
| 2 | Al guardar, el paciente aparece de inmediato en "Pacientes Activos" | ✅ | stream de `/pacientes` |
| 3 | Se registra el ID del usuario que creó el expediente (auditoría) | ✅ | campo `creadoPor` |

El `patientId` se genera legible (`204B-517`) porque es también el contenido del QR.

### US 2.2 — Generación y visualización de QR

> Como **Personal Clínico**, quiero **abrir el perfil de un paciente y ver su Código QR
> en pantalla**, para **tener su identificador listo y visible**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | El detalle del paciente dibuja el QR a partir de su `patientId` | ✅ | botón QR en el AppBar |
| 2 | El QR también aparece en el panel del simulador (para escanearlo de pantalla) | ✅ | `simulator_panel_screen.dart` |

---

## 4. Épica 3 — Simulación (smartwatch) y escáner en piso

### US 3.1 — Acceso al Modo Simulador

> Como **Personal del Hospital**, quiero **seleccionar "Modo Simulador" e ingresar un ID
> de paciente**, para **que el dispositivo actúe como el smartwatch de ese paciente**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Acceso sin autenticación; solo requiere un `patientId` válido | ✅ | `redirect` del router deja pasar `/simulator` |
| 2 | Panel con sliders y botones +/− para FC, SpO₂, presión y temperatura | ✅ | `simulator_panel_screen.dart` |
| 3 | El botón "Emitir" inyecta los datos en la base | ✅ | `SimulatorController.emit()` |

**Qué escribe cada "Emitir"**

| Paso | Nodo | Operación |
|---|---|---|
| 1 | `/pacientes/{id}/signosActuales` | `update` |
| 2 | `/pacientes/{id}/estado` | `update` con el estado derivado |
| 3 | `/signosHistorial/{id}` | `push` |
| 4 | `/alertas` | `push` por cada umbral cruzado |

**Extra:** antes de emitir, la pantalla previsualiza qué alertas se dispararían. Sirve
para dirigir la demo sin escribir a ciegas.

> **Desviación.** Los requerimientos decían Firestore; el proyecto usa Realtime Database.

### US 3.2 — Escáner QR de pacientes

> Como **Médico o Enfermero**, quiero **escanear el QR desde la cámara**, para **saltar
> al expediente sin buscar en la lista**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Botón "Escanear" accesible desde la navegación principal | ✅ | pestaña Escanear + acción rápida del dashboard |
| 2 | Al leer el código, redirige al expediente del paciente | ✅ | `scan_screen.dart` |
| 3 | Un QR que no corresponda a ningún paciente muestra error y no reintenta en bucle | ✅ | guarda el último código rechazado |

---

## 5. Épica 4 — Farmacia y medicación simplificada

### US 4.1 — Inventario móvil de farmacia

> Como **Farmacéutico**, quiero **gestionar el inventario desde una lista optimizada
> para móvil**, para **actualizar el stock desde los estantes**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | Vista exclusiva del rol `farmaceutico` | ✅ | pestaña solo visible para ese rol |
| 2 | Lista desplazable con buscador rápido por nombre | ✅ | `inventory_screen.dart` |
| 3 | Sumar o restar stock tocando el ítem | ✅ | `InventoryController.adjustStock()` |

El ajuste usa una transacción de RTDB para que dos farmacéuticos sobre el mismo ítem
no se pisen.

### US 4.2 — Prescripción y administración (MAR)

> Como **Médico y Enfermero**, quiero **recetar medicamentos y registrar su
> administración**, para **mantener el control de las dosis en el expediente**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | El médico agrega una orden desde el perfil del paciente, eligiendo del inventario | ✅ | `prescribe_sheet.dart` |
| 2 | El enfermero ve una lista de "Dosis Pendientes" | ✅ | `medications_checklist_screen.dart` |
| 3 | Al marcarla, se guarda su ID de enfermero y la hora | ✅ | `MedicationsController.administer()` |
| 4 | Marcar la dosis deslizando (swipe) | ⛔ | solo por botón |

El botón "+ Nueva orden médica" solo aparece si el rol en sesión es `medico`.

---

## 6. Épica 5 — Alertas críticas (in-app)

### US 5.1 — Notificaciones y panel de alertas

> Como **Médico o Enfermero**, quiero **recibir un aviso visual si los signos vitales
> caen a niveles críticos**, para **actuar de emergencia**.

| # | Criterio de aceptación | Estado | Dónde |
|---|---|---|---|
| 1 | La app escucha los cambios de alertas en tiempo real | ✅ | `alertsStreamProvider` (`onValue`) |
| 2 | Al dispararse una alerta aparece un Snackbar rojo sobre la pantalla del clínico | ✅ | `AlertWatcher` envuelve el shell |
| 3 | Pestaña "Alertas" con el historial de eventos críticos | ✅ | `alerts_list_screen.dart` |
| 4 | La lógica de "qué es crítico" se evalúa fuera del cliente | ⚠️ | ver desviación |

> **Desviación.** Sin Cloud Functions, los umbrales viven en `/config/umbrales` y los
> evalúa el simulador antes de escribir (`vitals_rules.dart`). Ventaja para la demo:
> los umbrales se editan desde la consola de Firebase y aplican al instante.

`AlertWatcher` marca como vistas las alertas de la primera emisión del stream; de lo
contrario, abrir la app lanzaría un Snackbar por cada alerta histórica.

---

## 7. Desviaciones respecto a las notas técnicas

| Nota técnica original | Motivo | Solución adoptada |
|---|---|---|
| Custom Tokens con Cloud Functions (US 1.1) | Sin servicios de pago | Validación en cliente contra `/usuarios`; sin Firebase Auth |
| Cloud Function para crear usuarios (US 1.2) | Sin servicios de pago | `push()` a `/usuarios`; el problema de la sesión del admin desaparece |
| Inyección en Firestore (US 3.1) | El proyecto usa RTDB | Escritura en Realtime Database |
| `onSnapshot` de Firestore (US 5.1) | El proyecto usa RTDB | `ref.onValue` con `limitToLast(30)` |
| Criticidad evaluada en backend (US 5.1) | Sin backend | Umbrales en `/config/umbrales`, evaluados en el cliente |

---

## 8. Fuera de alcance

| Tema | Motivo |
|---|---|
| Reglas de seguridad, autorización y protección de accesos | Excluido explícitamente: entorno de demostración controlado |
| PIN y contraseñas cifrados | Se guardan en claro por decisión del prototipo |
| Cerrar sesión | No aparece en ningún criterio de aceptación |
| Gráfica del historial de signos | `/signosHistorial` se escribe, pero aún no se grafica |
| Swipe para administrar dosis | El botón cubre el criterio |

---

## 9. Credenciales de la demo

| Rol | Acceso |
|---|---|
| Administrador | `admin@hospital.demo` / `admin123` |
| Farmacéutico | `farmacia@hospital.demo` / `farmacia123` |
| Médico | `MED-001` / PIN `123456` |
| Enfermero | `ENF-001` / PIN `654321` |
| Simulador | patientId `000-2204-B` |
