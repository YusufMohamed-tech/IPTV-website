import { Router } from "express";
import { getClientDashboard } from "../controllers/clientController.js";
import { authorize, protect } from "../middlewares/auth.js";

const router = Router();

router.get("/dashboard", protect, authorize("client"), getClientDashboard);

export default router;
