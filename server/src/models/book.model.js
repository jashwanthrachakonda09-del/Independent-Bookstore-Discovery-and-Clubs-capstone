import mongoose from "mongoose";

/**
 * Book model representing catalog records.
 * Contains literary metadata, themes, moods, and reading lengths.
 */
const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      index: "text",
    },
    authors: {
      type: [String],
      required: [true, "At least one author is required"],
      index: true,
    },
    isbn: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    publisher: {
      type: String,
      default: "",
    },
    publicationYear: {
      type: Number,
      default: null,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
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
    moods: {
      type: [String],
      default: [],
      index: true,
    },
    readingLength: {
      type: Number,
      default: null, // null when length metadata is missing (as required by Section 17)
      index: true,
    },
    readingLengthUnit: {
      type: String,
      enum: ["pages", "hours", "chapters", "minutes"],
      default: "pages",
    },
    formats: {
      type: [String],
      enum: ["paperback", "hardcover", "audiobook", "ebook", "signed_edition"],
      default: ["paperback"],
    },
    coverImage: {
      type: String,
      default: "",
    },
    publicationStatus: {
      type: String,
      enum: ["published", "forthcoming", "out_of_print"],
      default: "published",
    },
    embedding: {
      type: [Number],
      default: [],
    },
    embeddingModel: {
      type: String,
      default: "nomic-embed-text:latest",
    },
  },
  {
    timestamps: true,
  }
);

// Compound text index for title, authors, description, genres, themes, moods
bookSchema.index({
  title: "text",
  description: "text",
  genres: "text",
  themes: "text",
  moods: "text",
});

export const Book = mongoose.model("Book", bookSchema);
