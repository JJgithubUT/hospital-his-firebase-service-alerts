# HospitOS — Descripción para el sitio web

Texto de referencia para la página pública del proyecto.
Versión visual publicada como página: ver el enlace al final.

---

## Frase de portada

**HospitOS**
Sistema de Gestión Hospitalaria

> El expediente, los signos vitales y la alerta crítica,
> en el bolsillo de quien está junto a la cama.

---

## Qué es

HospitOS es un sistema de información hospitalaria pensado para el piso, no para el
escritorio.

Nace de una observación incómoda: la información que decide una urgencia casi nunca
está donde ocurre la urgencia. Está en la computadora del control de enfermería, en una
hoja impresa que alguien se llevó, en la memoria de quien pasó visita hace dos horas. El
personal clínico camina; los datos, no.

HospitOS invierte esa relación. Todo el expediente —quién es el paciente, qué se le
diagnosticó, cómo respira ahora mismo, qué medicamento le toca y quién se lo dio— vive
en el teléfono que el médico y el enfermero ya traen encima. Se abre escaneando el
código de la pulsera. Se actualiza solo. Y cuando algo se sale de rango, no espera a que
alguien lo consulte: interrumpe.

---

## El recorrido de un turno

| Paso | Momento | Qué pasa en la app |
|---|---|---|
| 1 | **Admisión** | Un formulario de cinco campos crea el expediente en segundos. Queda registrado quién lo abrió. |
| 2 | **Identificación** | Cada paciente lleva un código QR. Escanearlo abre su expediente al instante, sin buscar en listas. |
| 3 | **Monitoreo** | El monitor de cabecera publica los signos vitales de forma continua. La lista de pacientes cambia de color sola. |
| 4 | **Alerta** | Si un valor cruza el umbral clínico, el aviso aparece sobre la pantalla del personal, esté donde esté en la app. |
| 5 | **Medicación** | El médico receta desde el perfil del paciente; el enfermero marca la dosis y queda firmada con su nombre y la hora. |

Cinco pasos que hoy involucran una computadora fija, dos hojas de papel y una llamada
por teléfono.

---

## Un sistema, cuatro oficios

La misma aplicación se reconfigura según quién inicia sesión. Nadie navega entre
pantallas que no le tocan.

| Rol | Qué ve al entrar | Su trabajo en la app |
|---|---|---|
| **Médico** | Pacientes, alertas y cámara | Admite, revisa signos, receta |
| **Enfermero** | Dosis pendientes del turno | Administra y firma cada dosis |
| **Farmacéutico** | Inventario | Ajusta el stock desde el estante |
| **Administrador** | Usuarios y camas | Da de alta accesos y supervisa el piso |

El acceso también se adapta al oficio: el personal clínico entra con un código corto y un
PIN de seis dígitos —rápido, con las manos ocupadas, con guantes puestos—; el personal
de gestión, con correo y contraseña.

---

## Tiempo real, literalmente

No hay botón de "actualizar" en HospitOS. Cada pantalla está suscrita a los datos que
muestra: cuando el monitor de la cama 204-B publica una saturación de 87 %, la tarjeta de
esa paciente se pone roja en el teléfono de todo el personal del piso antes de que nadie
haya tocado nada.

Los umbrales de lo que se considera crítico no están escondidos en el código: viven en la
base de datos y se pueden ajustar en caliente, porque lo que es alarmante en terapia
intensiva no lo es en recuperación.

---

## Un dispositivo cualquiera

La interfaz se rediseña sola según el aparato que la abre: barra inferior en el teléfono,
riel lateral en la tablet, navegación por control remoto en la pantalla de la sala, y una
versión comprimida para reloj inteligente donde solo caben los signos y la alerta.

El monitor de cabecera no requiere hardware: cualquier teléfono puede entrar en **Modo
Simulador**, vincularse a un paciente y comportarse como su monitor de signos vitales,
con su código QR en pantalla listo para escanear.

---

## Ficha técnica

| Concepto | Detalle |
|---|---|
| Plataforma | Flutter — Android, web y escritorio desde una sola base de código |
| Datos | Firebase Realtime Database, suscripciones en vivo |
| Arquitectura | Toda la lógica en el cliente; sin servidor propio ni servicios de pago |
| Interfaz | Adaptativa: reloj, teléfono, tablet y TV |
| Identificación | Códigos QR generados a partir del identificador del paciente |
| Alcance | Prototipo funcional (MVP) para demostración |

---

## Nota de alcance

HospitOS es hoy un prototipo de demostración: funciona de extremo a extremo, con datos
reales moviéndose en tiempo real entre dispositivos, pero corre en un entorno controlado
y sin las medidas de seguridad que exigiría un despliegue clínico. Es una prueba de
concepto de la idea, no un producto certificado.
