import mongoose from "mongoose";

/**
 * Staff Membership model.
 * Assigns scoped privileges (Bookseller for a specific Bookstore, Moderator for a specific Club).
 */
const staffMembershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["bookseller", "moderator", "admin"],
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bookstore",
      default: null,
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "revoked"],
      default: "active",
      index: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate active roles for same user and resource
staffMembershipSchema.index({ userId: 1, role: 1, storeId: 1, clubId: 1 }, { unique: true });

export const StaffMembership = mongoose.model("StaffMembership", staffMembershipSchema);
