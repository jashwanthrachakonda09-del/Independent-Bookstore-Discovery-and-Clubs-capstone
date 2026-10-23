import express from "express";
import {
  registerUser,
  verifyEmail,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { rateLimiter } from "../middleware/rate-limit.middleware.js";
import { env } from "../config/env.config.js";

export const authRouter = express.Router();

/**
 * Register a new reader account.
 * URL: POST /api/auth/register
 */
authRouter.post("/register", async (req, res, next) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const result = await registerUser(validatedData);

    res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Verify reader email address.
 * URL: POST /api/auth/verify-email
 */
authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    const user = await verifyEmail(token);

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now reserve books and join reading clubs.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Sign in and receive HttpOnly session cookie.
 * URL: POST /api/auth/login
 */
authRouter.post(
  "/login",
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many login attempts. Please try again later." }),
  async (req, res, next) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers["user-agent"] || "";

      const { user, sessionToken, expiresAt } = await loginUser({
        ...validatedData,
        ipAddress,
        userAgent,
      });

      // Set HttpOnly cookie for browser sessions
      res.cookie("session_token", sessionToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        expires: expiresAt,
      });

      res.status(200).json({
        success: true,
        message: "Signed in successfully.",
        data: {
          user,
          sessionToken, // Also provided for API client headers
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get current authenticated user details.
 * URL: GET /api/auth/me
 */
authRouter.get("/me", requireAuth, async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toSafeObject(),
    },
  });
});

/**
 * Sign out and revoke current session.
 * URL: POST /api/auth/logout
 */
authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.session_token || req.headers.authorization?.split(" ")[1];
    await logoutUser(token);
    res.clearCookie("session_token");

    res.status(200).json({
      success: true,
      message: "Signed out successfully.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Initiate password recovery.
 * URL: POST /api/auth/forgot-password
 */
authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await forgotPassword(email);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Reset password using recovery token.
 * URL: POST /api/auth/reset-password
 */
authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, newPassword } = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(token, newPassword);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * Change password for signed-in user.
 * URL: POST /api/auth/change-password
 */
authRouter.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const result = await changePassword(req.user._id, currentPassword, newPassword);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
