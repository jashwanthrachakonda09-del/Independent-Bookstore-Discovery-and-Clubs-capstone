/**
 * Centralized error handling middleware.
 * Ensures consistent, predictable JSON error envelopes:
 * { success: false, message: "...", errors: [...] }
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // Structured logging for server-side diagnosis
  console.error(`[Error] ${req.method} ${req.originalUrl} - Status ${statusCode}: ${err.message}`);
  if (err.stack && process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred",
    errors: err.errors || null,
  });
}

/**
 * Async handler utility to wrap route handlers and catch unhandled promise rejections.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
