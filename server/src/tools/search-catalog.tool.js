import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Book } from "../models/book.model.js";

/**
 * Tool 1: searchCatalog
 * Retrieves authorized candidate books matching natural-language themes, genres, and length preferences.
 */
export const searchCatalogTool = tool(
  async ({ query = "", genre = "", theme = "", maxPages = null }) => {
    const filter = { publicationStatus: "published" };

    if (genre) {
      filter.genres = { $regex: new RegExp(genre, "i") };
    }
    if (theme) {
      filter.themes = { $regex: new RegExp(theme, "i") };
    }
    if (maxPages) {
      filter.readingLength = { $lte: maxPages };
    }

    const books = await Book.find(filter).limit(10).lean();

    // If query provided, rank or filter conceptually
    const results = books.map((b) => ({
      bookId: b._id.toString(),
      title: b.title,
      authors: b.authors,
      genres: b.genres,
      themes: b.themes,
      readingLength: b.readingLength,
      readingLengthUnit: b.readingLengthUnit,
      descriptionSummary: b.description.slice(0, 200) + "...",
    }));

    return JSON.stringify({
      count: results.length,
      candidates: results,
    });
  },
  {
    name: "search_catalog",
    description: "Search authorized bookstore catalog for candidate books matching preferences such as genre, theme, and reading length.",
    schema: z.object({
      query: z.string().optional().describe("Natural language query or themes"),
      genre: z.string().optional().describe("Genre filter (e.g. Mystery, Fantasy, Literary Fiction)"),
      theme: z.string().optional().describe("Theme keyword (e.g. Friendship, Coastal, Grief)"),
      maxPages: z.number().optional().describe("Maximum preferred reading length in pages"),
    }),
  }
);
