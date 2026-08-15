import { obtenerEstadoMonitor } from "../services/alerts-monitor.service.js";

export function healthController(req, res) {
    const monitor = obtenerEstadoMonitor();

    // Si el monitor está activo pero su último ciclo fue con error, el
    // servicio sigue "arriba" (HTTP responde) pero no está cumpliendo su
    // función: se reporta como degradado en vez de devolver un 200 ciego.
    const saludable = monitor.activo && monitor.ultimoCicloOk !== false;

    res.status(saludable ? 200 : 503).json({
        status: saludable ? "ok" : "degraded",
        service: "hospital-his-alerts-monitor-service",
        monitor
    });
}
