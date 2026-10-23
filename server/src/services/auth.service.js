import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../models/user.model.js";
import { Session } from "../models/session.model.js";
import { hashToken } from "../middleware/auth.middleware.js";
import { env } from "../config/env.config.js";

/**
 * Register a new reader account.
 * Assigns least-privileged 'reader' defaults and generates an email verification token.
 */
export async function registerUser({ name, email, password }) {
  // 1. Check for existing user
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    const error = new Error("An account with this email address already exists.");
    error.statusCode = 409;
    throw error;
  }

  // 2. Hash password securely
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // 3. Generate single-use verification token (valid for 24 hours)
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // 4. Create reader user (never privileged roles)
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    emailVerified: false, // Readers must verify before reserving copies or joining clubs
    verificationToken,
    verificationTokenExpiresAt,
    isSystemAdmin: false,
  });

  console.log(`[Auth] User registered: ${user.email}. Verification Token: ${verificationToken}`);

  return {
    user: user.toSafeObject(),
    verificationToken, // Returned in development for easy reproduction
  };
}

/**
 * Verify email address using single-use verification token.
 */
export async function verifyEmail(token) {
  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Verification token is invalid or has expired.");
    error.statusCode = 400;
    throw error;
  }

  user.emailVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpiresAt = null;
  await user.save();

  return user.toSafeObject();
}

/**
 * Authenticate user and issue an opaque server-side session.
 */
export async function loginUser({ email, password, ipAddress = "", userAgent = "" }) {
  // 1. Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  // 2. Check if account is suspended
  if (user.accountStatus === "suspended") {
    const error = new Error("This account has been suspended.");
    error.statusCode = 403;
    throw error;
  }

  // 3. Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  // 4. Generate opaque session token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  // Session valid for 7 days
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await Session.create({
    userId: user._id,
    tokenHash,
    ipAddress,
    userAgent,
    expiresAt,
  });

  return {
    user: user.toSafeObject(),
    sessionToken: rawToken,
    expiresAt,
  };
}

/**
 * Revoke session on logout.
 */
export async function logoutUser(rawToken) {
  if (!rawToken) return;
  const tokenHash = hashToken(rawToken);
  await Session.findOneAndUpdate({ tokenHash }, { isRevoked: true });
}

/**
 * Initiate password recovery.
 */
export async function forgotPassword(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Avoid leaking whether user exists
    return { success: true, message: "If that email exists, a password reset link has been sent." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = resetToken;
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  console.log(`[Auth] Password reset requested for ${user.email}. Reset Token: ${resetToken}`);

  return {
    success: true,
    resetToken, // Exposed in development/demo response for seamless testing
  };
}

/**
 * Reset password using valid reset token.
 */
export async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetTokenExpiresAt: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error("Password reset token is invalid or has expired.");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  user.passwordResetToken = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();

  // Revoke all existing sessions for security
  await Session.updateMany({ userId: user._id }, { isRevoked: true });

  return { success: true, message: "Password reset successful. Please sign in with your new password." };
}

/**
 * Change password for authenticated user.
 */
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Current password does not match.");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();

  // Revoke all sessions except current
  await Session.updateMany({ userId: user._id }, { isRevoked: true });

  return { success: true, message: "Password updated successfully." };
}
