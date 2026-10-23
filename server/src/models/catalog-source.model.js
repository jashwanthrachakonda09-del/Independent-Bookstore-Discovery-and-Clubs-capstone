import mongoose from "mongoose";

/**
 * Catalog Source model.
 * Stores approved synopses, excerpts, chapter notes, and store reviews
 * with explicit spoiler metadata and chapter/page boundaries.
 */
const catalogSourceSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ["synopsis", "excerpt", "chapter_summary", "store_review", "reading_guide"],
      required: true,
    },
    sourceName: {
      type: String,
      required: true,
    },
    sourceReference: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    chapter: {
      type: Number,
      default: null,
      index: true,
    },
    pageStart: {
      type: Number,
      default: null,
    },
    pageEnd: {
      type: Number,
      default: null,
    },
    approved: {
      type: Boolean,
      default: true,
      index: true,
    },
    permittedUse: {
      type: String,
      enum: ["discovery", "club_discussion", "public_catalog", "store_internal"],
      default: "discovery",
      index: true,
    },
    spoilerLevel: {
      type: String,
      enum: ["none", "mild", "major", "ending"],
      default: "none",
      index: true,
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

export const CatalogSource = mongoose.model("CatalogSource", catalogSourceSchema);
