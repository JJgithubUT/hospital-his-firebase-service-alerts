import express from "express";
import healthRoutes from "./routes/health.routes.js";
import { iniciarMonitoreoAlertas } from "./services/alerts-monitor.service.js";

const app = express();

app.use(express.json());

app.use("/", healthRoutes);

iniciarMonitoreoAlertas();

export { app };
