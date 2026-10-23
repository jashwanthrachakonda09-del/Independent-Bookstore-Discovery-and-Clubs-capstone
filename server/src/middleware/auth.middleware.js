import crypto from "crypto";
import { Session } from "../models/session.model.js";
import { User } from "../models/user.model.js";

/**
 * Hash raw session token using SHA-256 for secure lookup in MongoDB.
 */
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Authentication middleware.
 * Verifies opaque server-side session from HttpOnly cookie or Authorization header.
 */
export async function requireAuth(req, res, next) {
  try {
    // 1. Extract session token from cookie or Authorization header
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in.",
      });
    }

    // 2. Hash token to match database record
    const tokenHash = hashToken(token);

    // 3. Find active session
    const session = await Session.findOne({
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      res.clearCookie("session_token");
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please sign in again.",
      });
    }

    // 4. Find user and check account status
    const user = await User.findById(session.userId);
    if (!user || user.accountStatus === "suspended") {
      res.clearCookie("session_token");
      return res.status(403).json({
        success: false,
        message: "Account suspended or not found.",
      });
    }

    // 5. Attach safe user object and session to request
    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware.
 * Populates req.user if a valid session exists, but does not block unauthenticated users.
 */
export async function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.session_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      req.user = null;
      return next();
    }

    const tokenHash = hashToken(token);
    const session = await Session.findOne({
      tokenHash,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (session) {
      const user = await User.findById(session.userId);
      if (user && user.accountStatus !== "suspended") {
        req.user = user;
        req.session = session;
      }
    }
    next();
  } catch {
    req.user = null;
    next();
  }
}
