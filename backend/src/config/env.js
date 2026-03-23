import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(24, "JWT_SECRET must be at least 24 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_URL: z.string().url().optional(),
  FRONTEND_URLS: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = parsed.data;

export const allowedOrigins = (() => {
  const set = new Set();

  if (env.FRONTEND_URL) {
    set.add(env.FRONTEND_URL);
  }

  if (env.FRONTEND_URLS) {
    env.FRONTEND_URLS.split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => set.add(item));
  }

  if (env.NODE_ENV !== "production") {
    set.add("http://localhost:5173");
  }

  return [...set];
})();
