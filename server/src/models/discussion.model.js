import mongoose from "mongoose";

/**
 * Club Discussion Post & Reply model.
 * Enforces spoiler boundaries and records moderator actions with audit reasons.
 */
const discussionSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      trim: true,
      maxlength: 3000,
    },
    // Declare if this post contains spoilers up to chapter/page
    hasSpoilers: {
      type: Boolean,
      default: false,
      index: true,
    },
    spoilerChapter: {
      type: Number,
      default: 0,
      min: 0,
    },
    spoilerSummary: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["visible", "hidden", "flagged"],
      default: "visible",
      index: true,
    },
    moderationReason: {
      type: String,
      default: "",
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

discussionSchema.index({ clubId: 1, createdAt: -1 });

export const Discussion = mongoose.model("Discussion", discussionSchema);
