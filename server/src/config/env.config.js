import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

/**
 * Zod schema to validate environment variables at server startup.
 * Prevents runtime bugs by failing fast on missing or invalid configurations.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  HOLD_DURATION_HOURS: z.coerce.number().default(48),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  OLLAMA_CHAT_MODEL: z.string().default("qwen3:8b"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text:latest"),
  EMBEDDING_DIMENSION: z.coerce.number().default(768),
  UPLOAD_MAX_BYTES: z.coerce.number().default(5242880),
  ALLOWED_FILE_TYPES: z.string().default("application/pdf,text/plain"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(200),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Environment configuration validation failed:");
  console.error(parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
