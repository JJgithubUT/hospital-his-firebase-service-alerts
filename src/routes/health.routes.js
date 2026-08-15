import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

const router = Router();

router.get("/", (req, res) => {
    res.json({
        service: "hospital-his-alerts-monitor-service",
        status: "ok"
    });
});

router.get("/health", healthController);

export default router;
