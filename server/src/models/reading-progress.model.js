import mongoose from "mongoose";

/**
 * Reading Progress & Reader Spoiler Boundaries schema.
 * Dictates whether the AI or club members can reveal details beyond the reader's declared checkpoint.
 */
const readingProgressSchema = new mongoose.Schema(
  {
    readerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["want_to_read", "reading", "completed", "abandoned"],
      default: "reading",
      index: true,
    },
    currentPage: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentChapter: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    visibility: {
      type: String,
      enum: ["private", "club"],
      default: "private",
    },
    // Spoiler control mode for this book
    spoilerMode: {
      type: String,
      enum: ["spoiler_free", "progress_limited", "full_book"],
      default: "spoiler_free",
      index: true,
    },
    // Chapter or page boundary up to which discussion/RAG retrieval is permitted
    maximumPermittedChapter: {
      type: Number,
      default: 1,
      min: 0,
    },
    maximumPermittedPage: {
      type: Number,
      default: 0,
      min: 0,
    },
    privateNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

readingProgressSchema.index({ readerId: 1, bookId: 1 }, { unique: true });

export const ReadingProgress = mongoose.model("ReadingProgress", readingProgressSchema);
