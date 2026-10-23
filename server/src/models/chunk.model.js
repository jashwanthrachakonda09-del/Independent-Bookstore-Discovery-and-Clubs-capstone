import mongoose from "mongoose";

/**
 * Chunk model for Atlas Vector Search and grounded RAG.
 * Stores chunk text, embedding vector, model version, and spoiler boundary tags.
 */
const chunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
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
    chunkIndex: {
      type: Number,
      required: true,
    },
    chunkText: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    embeddingModel: {
      type: String,
      required: true,
      default: "nomic-embed-text:latest",
    },
    chapter: {
      type: Number,
      default: null,
      index: true,
    },
    pageNumber: {
      type: Number,
      default: null,
    },
    spoilerLevel: {
      type: String,
      enum: ["none", "mild", "major", "ending"],
      default: "none",
      index: true,
    },
    scope: {
      type: String,
      enum: ["public", "store_only", "club_only"],
      default: "public",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

chunkSchema.index({ bookId: 1, chapter: 1 });
chunkSchema.index({ documentId: 1, chunkIndex: 1 });

export const Chunk = mongoose.model("Chunk", chunkSchema);
