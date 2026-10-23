import mongoose from "mongoose";

/**
 * Reading List entry sub-schema.
 */
const readingListItemSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

/**
 * Reading List schema.
 * All lists are owner-only private by default.
 */
const readingListSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "List name is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
      index: true,
    },
    books: {
      type: [readingListItemSchema],
      default: [],
    },
    isDefaultSystemList: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique list names per owner
readingListSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export const ReadingList = mongoose.model("ReadingList", readingListSchema);
