import mongoose from "mongoose";

/**
 * Club Membership model.
 * Records user membership, role, status, and spoiler preference.
 */
const clubMembershipSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["member", "moderator"],
      default: "member",
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "left", "revoked"],
      default: "active",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    spoilerPreference: {
      type: String,
      enum: ["spoiler_free", "progress_limited", "full_book"],
      default: "progress_limited",
    },
  },
  {
    timestamps: true,
  }
);

clubMembershipSchema.index({ clubId: 1, userId: 1 }, { unique: true });

export const ClubMembership = mongoose.model("ClubMembership", clubMembershipSchema);
