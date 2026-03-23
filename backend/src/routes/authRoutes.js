import { Router } from "express";
import { z } from "zod";
import { login, me, setupTwoFactor, verifyTwoFactor } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    otp: z.string().optional(),
    deviceInfo: z.string().optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const verify2faSchema = z.object({
  body: z.object({ token: z.string().min(6) }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

router.post("/login", validate(loginSchema), login);
router.get("/me", protect, me);
router.post("/2fa/setup", protect, setupTwoFactor);
router.post("/2fa/verify", protect, validate(verify2faSchema), verifyTwoFactor);

export default router;
