import mongoose from "mongoose";

/**
 * Document model for RAG ingestion.
 * Tracks uploaded policies, reading guides, and excerpts with extraction status.
 */
const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["application/pdf", "text/plain", "pdf", "txt"],
      required: true,
    },
    documentType: {
      type: String,
      enum: ["book_excerpt", "store_policy", "club_guidelines", "catalog_description"],
      default: "book_excerpt",
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
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
    processingStatus: {
      type: String,
      enum: ["uploaded", "extracting", "embedding", "ready", "failed"],
      default: "uploaded",
      index: true,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

export const Document = mongoose.model("Document", documentSchema);
