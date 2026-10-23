import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.config.js";
import { connectDB } from "./config/db.config.js";
import { checkOllamaHealth } from "./config/ollama.config.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { startReservationExpiryJob } from "./jobs/reservation-expiry.job.js";

// Import API Routers
import { authRouter } from "./api/auth.router.js";
import { bookRouter } from "./api/book.router.js";
import { reservationRouter } from "./api/reservation.router.js";
import { readingListRouter } from "./api/reading-list.router.js";
import { readingProgressRouter } from "./api/reading-progress.router.js";
import { clubRouter } from "./api/club.router.js";
import { booksellerRouter } from "./api/bookseller.router.js";
import { adminRouter, handleUpdateStaffRole } from "./api/admin.router.js";
import { bookChatRouter } from "./api/book-chat.router.js";
import { documentRouter } from "./api/document.router.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { requireAdmin } from "./middleware/rbac.middleware.js";

const app = express();

/**
 * Configure global middleware
 */
app.use(
  cors({
    origin: [env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(env.SESSION_SECRET));

// Request logger
app.use((req, res, next) => {
  if (env.NODE_ENV !== "test") {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});

/**
 * Health check endpoint
 * URL: GET /api/health
 */
app.get("/api/health", async (req, res) => {
  const ollama = await checkOllamaHealth();
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    ollama,
  });
});

/**
 * Register API routes under /api
 */
app.use("/api/auth", authRouter);
app.use("/api/books", bookRouter);
app.use("/api", reservationRouter);
app.use("/api/reading-lists", readingListRouter);
app.use("/api/reading-progress", readingProgressRouter);
app.use("/api/clubs", clubRouter);
app.use("/api", clubRouter); // For /api/discussions/:id/moderation
app.use("/api/bookseller", booksellerRouter);
app.use("/api/admin", adminRouter);
app.patch("/api/users/:id/staff-role", requireAuth, requireAdmin, handleUpdateStaffRole);
app.use("/api/book-chat", bookChatRouter);
app.use("/api/documents", documentRouter);

// Centralized error handling
app.use(errorHandler);

/**
 * Server boot function
 */
export async function startServer() {
  await connectDB();

  // Start background hold expiration worker
  if (env.NODE_ENV !== "test") {
    startReservationExpiryJob();
  }

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Bookstore Discovery Server running on http://localhost:${env.PORT}`);
    console.log(`📚 Local AI Model: ${env.OLLAMA_CHAT_MODEL} | Embedding: ${env.OLLAMA_EMBEDDING_MODEL}`);
  });

  return server;
}

// Auto-start when executed directly
if (process.argv[1] && process.argv[1].endsWith("server.js")) {
  startServer().catch((err) => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
}

export default app;
