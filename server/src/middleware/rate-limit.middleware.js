/**
 * In-memory sliding rate limiter.
 * Protects against brute-force authentication attacks and API abuse.
 */
export function rateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message = "Too many requests. Please try again later." } = {}) {
  const ipRequests = new Map();

  return (req, res, next) => {
    // In test environment, bypass rate limits to avoid test flakiness
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.connection.remoteAddress || "unknown-ip";
    const now = Date.now();

    const requestData = ipRequests.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > requestData.resetTime) {
      requestData.count = 1;
      requestData.resetTime = now + windowMs;
    } else {
      requestData.count += 1;
    }

    ipRequests.set(ip, requestData);

    if (requestData.count > max) {
      return res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
    }

    next();
  };
}
