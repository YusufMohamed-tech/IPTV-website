import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import resellerRoutes from "./routes/resellerRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { allowedOrigins, env } from "./config/env.js";

const app = express();

// Baseline API hardening and request normalization.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7"
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 25,
  standardHeaders: "draft-7",
  message: { message: "Too many authentication attempts. Please try again later." }
});

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  }
};

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(limiter);
app.use("/api/auth", authLimiter);

// Health probe used by orchestrators and uptime monitors.
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reseller", resellerRoutes);
app.use("/api/client", clientRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
