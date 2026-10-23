import mongoose from "mongoose";

/**
 * Audit Log model.
 * Records sensitive actions: stock adjustments, reservation collections,
 * expired holds, role grants, and moderation actions.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actingUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "STOCK_ADJUSTMENT",
        "RESERVATION_COLLECTED",
        "RESERVATION_CANCELLED",
        "HOLD_EXPIRED",
        "ROLE_GRANTED",
        "ROLE_REVOKED",
        "MODERATION_ACTION",
        "BOOK_SELECTION_PUBLISHED",
        "DOCUMENT_UPLOADED",
      ],
      index: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bookstore",
      default: null,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
