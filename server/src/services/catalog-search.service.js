import { Book } from "../models/book.model.js";
import { Inventory } from "../models/inventory.model.js";
import { generateQueryEmbedding } from "./generate-embeddings.service.js";

/**
 * Compute cosine similarity between two normalized vectors.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Natural language semantic discovery with hybrid deterministic filters.
 * Returns books with evidence-based match explanations and stored inventory status.
 */
export async function searchCatalog({
  q = "",
  genre = "",
  mood = "",
  theme = "",
  maxPages = null,
  storeId = null,
  inStockOnly = false,
  page = 1,
  limit = 12,
}) {
  // 1. Build initial deterministic MongoDB filter query
  const filter = { publicationStatus: "published" };

  if (genre) {
    filter.genres = { $regex: new RegExp(`^${genre}$`, "i") };
  }
  if (mood) {
    filter.moods = { $regex: new RegExp(`^${mood}$`, "i") };
  }
  if (theme) {
    filter.themes = { $regex: new RegExp(`^${theme}$`, "i") };
  }
  if (maxPages) {
    filter.readingLength = { $lte: Number(maxPages) };
  }

  // 2. Fetch matching candidate books from catalog
  let books = await Book.find(filter).lean();

  // 3. If a natural-language query was provided, perform semantic scoring
  let scoredBooks = [];

  if (q && q.trim().length > 0) {
    const trimmedQuery = q.trim();
    let queryEmbedding;
    try {
      queryEmbedding = await generateQueryEmbedding(trimmedQuery);
    } catch (err) {
      console.warn(`[Search Warning] Failed to generate query embedding: ${err.message}`);
    }

    const queryLower = trimmedQuery.toLowerCase();
    const queryTokens = queryLower.split(/\s+/).filter((w) => w.length > 2);

    for (const book of books) {
      let semanticScore = 0;
      if (queryEmbedding && book.embedding && book.embedding.length === queryEmbedding.length) {
        semanticScore = cosineSimilarity(queryEmbedding, book.embedding);
      }

      // Keyword / Attribute boost
      let keywordScore = 0;
      const titleLower = (book.title || "").toLowerCase();
      const descLower = (book.description || "").toLowerCase();
      const themesLower = (book.themes || []).map((t) => t.toLowerCase());
      const genresLower = (book.genres || []).map((g) => g.toLowerCase());
      const moodsLower = (book.moods || []).map((m) => m.toLowerCase());

      for (const token of queryTokens) {
        if (titleLower.includes(token)) keywordScore += 0.3;
        if (descLower.includes(token)) keywordScore += 0.15;
        if (themesLower.some((t) => t.includes(token))) keywordScore += 0.25;
        if (genresLower.some((g) => g.includes(token))) keywordScore += 0.2;
        if (moodsLower.some((m) => m.includes(token))) keywordScore += 0.2;
      }

      const totalScore = semanticScore * 0.6 + Math.min(keywordScore, 0.4);

      // Generate honest evidence-based explanation
      const matchReasons = [];
      const missingInfo = [];

      for (const token of queryTokens) {
        const matchingGenre = (book.genres || []).find((g) => g.toLowerCase().includes(token));
        if (matchingGenre && !matchReasons.includes(`Genre: ${matchingGenre}`)) {
          matchReasons.push(`Matches genre: ${matchingGenre}`);
        }

        const matchingTheme = (book.themes || []).find((t) => t.toLowerCase().includes(token));
        if (matchingTheme && !matchReasons.includes(`Theme: ${matchingTheme}`)) {
          matchReasons.push(`Explores theme: ${matchingTheme}`);
        }

        const matchingMood = (book.moods || []).find((m) => m.toLowerCase().includes(token));
        if (matchingMood && !matchReasons.includes(`Mood: ${matchingMood}`)) {
          matchReasons.push(`Mood fit: ${matchingMood}`);
        }
      }

      if (matchReasons.length === 0 && semanticScore > 0.4) {
        matchReasons.push("Conceptual match with described plot and atmosphere");
      }

      if (!book.readingLength) {
        missingInfo.push("Reading length is unrecorded in catalog metadata");
      }

      scoredBooks.push({
        ...book,
        similarityScore: Number(totalScore.toFixed(3)),
        matchReasons: matchReasons.length > 0 ? matchReasons : ["Thematic match to natural language query"],
        missingInfo,
      });
    }

    // Sort by descending score
    scoredBooks.sort((a, b) => b.similarityScore - a.similarityScore);
  } else {
    scoredBooks = books.map((b) => ({
      ...b,
      similarityScore: 1.0,
      matchReasons: ["Standard catalog browse"],
      missingInfo: !b.readingLength ? ["Reading length unrecorded"] : [],
    }));
  }

  // 4. Populate real database-backed inventory for each candidate
  const enrichedBooks = [];

  for (const book of scoredBooks) {
    const invQuery = { bookId: book._id };
    if (storeId) {
      invQuery.storeId = storeId;
    }

    const inventoryRecords = await Inventory.find(invQuery).populate("storeId", "name slug address").lean();

    let totalAvailable = 0;
    const storeSummaries = inventoryRecords.map((inv) => {
      const avail = Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
      totalAvailable += avail;
      return {
        storeId: inv.storeId?._id,
        storeName: inv.storeId?.name || "Independent Bookstore",
        condition: inv.condition,
        format: inv.format,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        availableQuantity: avail,
        price: inv.price,
        pickupWindows: inv.pickupWindows,
      };
    });

    // If reader requested only in-stock titles, filter out zero-stock books
    if (inStockOnly && totalAvailable === 0) {
      continue;
    }

    enrichedBooks.push({
      ...book,
      inventorySummary: {
        totalAvailable,
        isReservable: totalAvailable > 0,
        stores: storeSummaries,
      },
    });
  }

  // 5. Pagination
  const total = enrichedBooks.length;
  const startIndex = (page - 1) * limit;
  const paginatedBooks = enrichedBooks.slice(startIndex, startIndex + limit);

  return {
    books: paginatedBooks,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
