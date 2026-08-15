import {
    getDatabase,
    ref,
    get,
    update,
    push,
    child
} from "firebase/database";

import { app as firebaseApp } from "../../firebase.js";

const db = getDatabase(firebaseApp);

// Requisito: el ciclo de escaneo y validación se ejecuta cada 5 segundos.
const INTERVALO_MS = 5000;

// Severidad numérica para poder comparar "cuál es peor".
const RANGO_SEVERIDAD = {
    estable: 0,
    atencion: 1,
    critico: 2
};

// Etiquetas legibles para el mensaje de la alerta.
const ETIQUETAS_SIGNO = {
    hr: "FC",
    spo2: "SpO2",
    temperatura: "Temperatura",
    sistolica: "Presión sistólica",
    diastolica: "Presión diastólica",
    frecuenciaRespiratoria: "Frec. respiratoria"
};

// Estado en memoria: qué alerta (tipo -> severidad) está activa por paciente.
// Evita reescribir /alertas en cada ciclo mientras el valor se mantenga
// anómalo sin empeorar, y permite volver a alertar si el signo se
// normaliza y luego recae.
const alertasActivas = {};

// Estado observable del propio monitor, para exponer en /health.
const estadoMonitor = {
    activo: false,
    ultimoCicloEn: null,
    ultimoCicloOk: null,
    ultimoError: null,
    pacientesEvaluados: 0,
    alertasGeneradasUltimoCiclo: 0
};

export function obtenerEstadoMonitor() {
    return { ...estadoMonitor };
}

/**
 * Evalúa un valor puntual contra sus reglas de umbral.
 * Devuelve 'critica' | 'atencion' | null.
 */
function evaluarSeveridadSigno(valor, reglas) {
    if (!reglas || valor === undefined || valor === null) {
        return null;
    }

    const esCritico =
        (reglas.criticoMenorQue !== undefined && valor < reglas.criticoMenorQue) ||
        (reglas.criticoMayorQue !== undefined && valor > reglas.criticoMayorQue);

    if (esCritico) {
        return "critica";
    }

    const esAtencion =
        (reglas.atencionMenorQue !== undefined && valor < reglas.atencionMenorQue) ||
        (reglas.atencionMayorQue !== undefined && valor > reglas.atencionMayorQue);

    if (esAtencion) {
        return "atencion";
    }

    return null;
}

function construirMensaje(tipo, valor, reglas, severidad) {
    const etiqueta = ETIQUETAS_SIGNO[tipo] || tipo;

    const umbral = severidad === "critica"
        ? (reglas.criticoMenorQue !== undefined
            ? `< ${reglas.criticoMenorQue}`
            : `> ${reglas.criticoMayorQue}`)
        : (reglas.atencionMenorQue !== undefined
            ? `< ${reglas.atencionMenorQue}`
            : `> ${reglas.atencionMayorQue}`);

    const nivel = severidad === "critica" ? "crítico" : "de atención";

    return `${etiqueta} ${valor} (umbral ${nivel} ${umbral})`;
}

/**
 * Evalúa un único paciente contra los umbrales vigentes.
 * Escribe en `updates` (mutado por referencia) las alertas nuevas y,
 * si corresponde, el nuevo estado del paciente.
 * Devuelve cuántas alertas nuevas generó.
 */
function procesarPaciente(patientId, paciente, umbrales, updates, timestamp) {
    const signos = paciente.signosActuales;

    if (!signos) {
        return 0;
    }

    if (!alertasActivas[patientId]) {
        alertasActivas[patientId] = {};
    }

    let peorEstado = "estable";
    let alertasNuevas = 0;

    for (const [tipo, valor] of Object.entries(signos)) {
        const reglas = umbrales[tipo];

        if (!reglas) {
            continue;
        }

        const severidad = evaluarSeveridadSigno(valor, reglas);
        const severidadPrevia = alertasActivas[patientId][tipo] || null;

        if (severidad) {
            const nivelEstado = severidad === "critica" ? "critico" : "atencion";

            if (RANGO_SEVERIDAD[nivelEstado] > RANGO_SEVERIDAD[peorEstado]) {
                peorEstado = nivelEstado;
            }

            // Solo se emite una alerta nueva si:
            //  - no había alerta activa para este signo (primera detección), o
            //  - la severidad empeoró (atencion -> critica).
            // Si sigue igual de anómalo ciclo tras ciclo, no se duplica.
            const debeAlertar =
                severidadPrevia === null ||
                (severidadPrevia === "atencion" && severidad === "critica");

            if (debeAlertar) {
                const nuevaAlertaRef = push(child(ref(db), "alertas"));

                updates[`alertas/${nuevaAlertaRef.key}`] = {
                    pacienteId: patientId,
                    pacienteNombre: paciente.nombre,
                    habitacion: `${paciente.habitacion || ""}${paciente.cama || ""}`,
                    tipo,
                    severidad,
                    valor,
                    mensaje: construirMensaje(tipo, valor, reglas, severidad),
                    creadaEn: timestamp,
                    creadaPor: "monitor-backend",
                    atendida: false,
                    atendidaPor: null,
                    atendidaEn: null
                };

                alertasNuevas++;
            }

            alertasActivas[patientId][tipo] = severidad;

        } else if (severidadPrevia !== null) {
            // El signo volvió a la normalidad: se limpia el estado en
            // memoria para que una futura anomalía vuelva a generar alerta.
            delete alertasActivas[patientId][tipo];
        }
    }

    if (peorEstado !== paciente.estado) {
        updates[`pacientes/${patientId}/estado`] = peorEstado;
    }

    return alertasNuevas;
}

/**
 * Un ciclo completo de escaneo: lee pacientes activos + umbrales vigentes,
 * evalúa cada signo y persiste alertas/estados en una sola escritura.
 */
export async function cicloMonitoreoAlertas() {
    const timestamp = new Date().toISOString();

    try {
        const dbRef = ref(db);

        const [pacientesSnap, umbralesSnap] = await Promise.all([
            get(child(dbRef, "pacientes")),
            get(child(dbRef, "config/umbrales"))
        ]);

        if (!pacientesSnap.exists() || !umbralesSnap.exists()) {
            console.warn(
                "[alertas] Faltan nodos /pacientes o /config/umbrales; se omite el ciclo."
            );
            estadoMonitor.ultimoCicloEn = timestamp;
            estadoMonitor.ultimoCicloOk = true;
            estadoMonitor.ultimoError = null;
            return;
        }

        const pacientes = pacientesSnap.val();
        const umbrales = umbralesSnap.val();
        const updates = {};

        let pacientesEvaluados = 0;
        let totalAlertasNuevas = 0;

        for (const [patientId, paciente] of Object.entries(pacientes)) {
            if (!paciente.activo) {
                continue;
            }

            totalAlertasNuevas += procesarPaciente(
                patientId,
                paciente,
                umbrales,
                updates,
                timestamp
            );

            pacientesEvaluados++;
        }

        if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
        }

        estadoMonitor.ultimoCicloEn = timestamp;
        estadoMonitor.ultimoCicloOk = true;
        estadoMonitor.ultimoError = null;
        estadoMonitor.pacientesEvaluados = pacientesEvaluados;
        estadoMonitor.alertasGeneradasUltimoCiclo = totalAlertasNuevas;

        if (totalAlertasNuevas > 0) {
            console.log(
                `[${timestamp}] Ciclo de alertas: ${pacientesEvaluados} pacientes evaluados, ` +
                `${totalAlertasNuevas} alertas nuevas generadas.`
            );
        }

    } catch (error) {
        console.error("[alertas] Error en el ciclo de monitoreo:", error);

        estadoMonitor.ultimoCicloEn = timestamp;
        estadoMonitor.ultimoCicloOk = false;
        estadoMonitor.ultimoError = error.message;
    }
}

let intervaloActivo = null;

export function iniciarMonitoreoAlertas() {
    if (intervaloActivo) {
        console.warn("[alertas] El monitor de alertas ya está en ejecución.");
        return;
    }

    console.log(
        `[alertas] Iniciando monitor de alertas críticas (cada ${INTERVALO_MS / 1000}s)...`
    );

    estadoMonitor.activo = true;

    // Primer ciclo inmediato, luego cada INTERVALO_MS.
    cicloMonitoreoAlertas();

    intervaloActivo = setInterval(cicloMonitoreoAlertas, INTERVALO_MS);
}

export function detenerMonitoreoAlertas() {
    if (intervaloActivo) {
        clearInterval(intervaloActivo);
        intervaloActivo = null;
        estadoMonitor.activo = false;
        console.log("[alertas] Monitor de alertas detenido.");
    }
}
