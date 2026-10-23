import mongoose from "mongoose";

/**
 * Club Meeting model.
 * Outlines meeting schedule, selected reading target, and discussion agenda.
 */
const meetingSchema = new mongoose.Schema(
  {
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled date/time is required"],
      index: true,
    },
    timezone: {
      type: String,
      default: "America/New_York",
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 300,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
      index: true,
    },
    readingTarget: {
      type: String,
      default: "Chapters 1 through 5",
    },
    targetChapter: {
      type: Number,
      default: null,
    },
    agenda: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["upcoming", "completed", "cancelled"],
      default: "upcoming",
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

meetingSchema.index({ clubId: 1, scheduledAt: 1 });

export const Meeting = mongoose.model("Meeting", meetingSchema);
