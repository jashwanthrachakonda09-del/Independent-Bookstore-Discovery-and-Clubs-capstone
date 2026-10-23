import mongoose from "mongoose";

/**
 * Reading Club model.
 * Holds club preferences, discussion guidelines, expected group size, and current reading selection.
 */
const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Club name is required"],
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Club description is required"],
    },
    genres: {
      type: [String],
      default: [],
      index: true,
    },
    themes: {
      type: [String],
      default: [],
      index: true,
    },
    membershipPolicy: {
      type: String,
      enum: ["open", "approval_required"],
      default: "open",
    },
    discussionRules: {
      type: String,
      default: "Be respectful. Always tag spoilers with chapter references. Keep discussions constructive.",
    },
    spoilerPolicy: {
      type: String,
      enum: ["strict_no_spoilers", "chapter_synchronized", "unrestricted_post_meeting"],
      default: "chapter_synchronized",
    },
    expectedGroupSize: {
      type: Number,
      required: true,
      default: 8,
      min: [2, "Club group size must be at least 2"],
    },
    readingLengthLimit: {
      type: Number,
      default: 400, // Maximum pages preferred by club
    },
    timezone: {
      type: String,
      default: "America/New_York",
    },
    currentBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Club = mongoose.model("Club", clubSchema);
