import express from "express";
import { User } from "../models/user.model.js";
import { StaffMembership } from "../models/staff-membership.model.js";
import { AuditLog } from "../models/audit-log.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { Club } from "../models/club.model.js";
import { updateStaffRoleSchema } from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/rbac.middleware.js";
import { recordAuditEvent } from "../services/audit.service.js";
import { checkOllamaHealth } from "../config/ollama.config.js";
import mongoose from "mongoose";

export const adminRouter = express.Router();

/**
 * Update staff role (Bookseller / Moderator / Admin) through authorized administrator controls.
 * Ordinary registration never permits users to select privileged roles.
 * URL: PATCH /api/users/:id/staff-role or /api/admin/users/:id/staff-role
 */
export async function handleUpdateStaffRole(req, res, next) {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "Target user not found." });
    }

    const validatedData = updateStaffRoleSchema.parse(req.body);

    const membership = await StaffMembership.findOneAndUpdate(
      {
        userId: targetUser._id,
        role: validatedData.role,
        storeId: validatedData.storeId || null,
        clubId: validatedData.clubId || null,
      },
      {
        status: validatedData.status,
        invitedBy: req.user._id,
        revokedAt: validatedData.status === "revoked" ? new Date() : null,
      },
      { upsert: true, new: true }
    );

    // Record audit event
    await recordAuditEvent({
      actingUserId: req.user._id,
      action: validatedData.status === "revoked" ? "ROLE_REVOKED" : "ROLE_GRANTED",
      entity: "StaffMembership",
      entityId: membership._id,
      storeId: validatedData.storeId || null,
      details: {
        targetUserId: targetUser._id,
        targetEmail: targetUser.email,
        role: validatedData.role,
        reason: validatedData.reason,
      },
    });

    res.status(200).json({
      success: true,
      message: `Staff role ${validatedData.role} (${validatedData.status}) updated for ${targetUser.email}.`,
      data: { membership },
    });
  } catch (error) {
    next(error);
  }
}

adminRouter.patch("/users/:id/staff-role", requireAuth, requireAdmin, handleUpdateStaffRole);

/**
 * List audit logs with pagination and action filters.
 * URL: GET /api/admin/audit-logs
 */
adminRouter.get("/audit-logs", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { action, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const logs = await AuditLog.find(filter)
      .populate("actingUserId", "name email")
      .populate("storeId", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: { auditLogs: logs },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Operational system health check.
 * Checks MongoDB connection, Ollama availability, and local vector search.
 * URL: GET /api/admin/system-health
 */
adminRouter.get("/system-health", async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const ollamaHealth = await checkOllamaHealth();

  res.status(200).json({
    success: true,
    data: {
      timestamp: new Date(),
      database: {
        status: mongoStatus,
        host: mongoose.connection.host,
        dbName: mongoose.connection.name,
      },
      ollama: ollamaHealth,
      vectorSearch: {
        mode: ollamaHealth.available ? "Local Ollama Embeddings + Cosine Similarity" : "Fallback Vector Simulation",
        embeddingModel: ollamaHealth.embeddingModel,
        dimension: ollamaHealth.embeddingDimension || 768,
      },
    },
  });
});
