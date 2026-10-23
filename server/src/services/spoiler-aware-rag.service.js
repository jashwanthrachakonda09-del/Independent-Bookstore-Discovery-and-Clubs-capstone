import { Chunk } from "../models/chunk.model.js";
import { Book } from "../models/book.model.js";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { Club } from "../models/club.model.js";
import { chatModel } from "../config/ollama.config.js";
import { generateQueryEmbedding } from "./generate-embeddings.service.js";
import { generateStandaloneQuery } from "./generate-standalone-query.service.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

/**
 * Generate a spoiler-aware, grounded RAG response for book discussions, store policies, or club inquiries.
 */
export async function generateSpoilerAwareRagAnswer({
  user,
  query,
  bookId = null,
  storeId = null,
  clubId = null,
  conversationHistory = [],
}) {
  // 1. Rewrite context-dependent follow-up query into standalone search query
  const standaloneQuery = await generateStandaloneQuery(query, conversationHistory);

  // 2. Determine reader's authorized spoiler boundary
  let readerSpoilerMode = "spoiler_free";
  let maxPermittedChapter = 1;

  if (user && bookId) {
    const progress = await ReadingProgress.findOne({ readerId: user._id, bookId });
    if (progress) {
      readerSpoilerMode = progress.spoilerMode || "spoiler_free";
      maxPermittedChapter = progress.maximumPermittedChapter || 1;
    }
  }

  // 3. Construct chunk filter query with spoiler and scope boundaries
  const chunkFilter = {};

  if (bookId) {
    chunkFilter.bookId = bookId;
  }
  if (storeId) {
    chunkFilter.storeId = storeId;
  }
  if (clubId) {
    chunkFilter.clubId = clubId;
  }

  // Apply spoiler boundary filter
  if (readerSpoilerMode === "spoiler_free") {
    chunkFilter.spoilerLevel = "none";
  } else if (readerSpoilerMode === "progress_limited") {
    chunkFilter.$or = [
      { spoilerLevel: "none" },
      { chapter: { $lte: maxPermittedChapter }, spoilerLevel: { $ne: "ending" } },
    ];
  }
  // full_book permits all chunks for the given book

  // 4. Retrieve candidate chunks
  const chunks = await Chunk.find(chunkFilter).limit(20).lean();

  // If vector search is available, score chunks by query embedding
  let relevantChunks = [];
  try {
    const queryVector = await generateQueryEmbedding(standaloneQuery);
    relevantChunks = chunks.map((chunk) => {
      let score = 0;
      if (chunk.embedding && chunk.embedding.length === queryVector.length) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < queryVector.length; i++) {
          dot += queryVector[i] * chunk.embedding[i];
          normA += queryVector[i] * queryVector[i];
          normB += chunk.embedding[i] * chunk.embedding[i];
        }
        score = normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
      }
      return { ...chunk, score };
    });
    relevantChunks.sort((a, b) => b.score - a.score);
  } catch {
    relevantChunks = chunks;
  }

  // Take top-k chunks
  const topChunks = relevantChunks.slice(0, 5);

  // 5. Check if query asks for spoilers beyond boundary
  const queryLower = standaloneQuery.toLowerCase();
  const spoilerIntentWords = ["ending", "how does it end", "who dies", "killer", "culprit", "climax", "final twist"];
  const isAskingSpoiler = spoilerIntentWords.some((w) => queryLower.includes(w));

  if (isAskingSpoiler && readerSpoilerMode !== "full_book") {
    return {
      answer: `I respect your spoiler preferences (currently set to ${readerSpoilerMode === "spoiler_free" ? "Spoiler-Free" : `Progress-Limited up to Chapter ${maxPermittedChapter}`}). I cannot reveal plot climaxes or ending details beyond your declared reading progress. You can update your reading progress or spoiler settings if you wish to unlock full-book discussions!`,
      citations: [],
      spoilerBlocked: true,
    };
  }

  // 6. Gather book, store, and club reference metadata as additional grounded context
  let contextBlocks = [];
  const citations = [];

  if (bookId) {
    const book = await Book.findById(bookId).lean();
    if (book) {
      contextBlocks.push(
        `BOOK METADATA:\nTitle: ${book.title}\nAuthors: ${book.authors.join(", ")}\nGenres: ${book.genres.join(", ")}\nThemes: ${book.themes.join(", ")}\nReading Length: ${book.readingLength ? `${book.readingLength} ${book.readingLengthUnit}` : "Unknown"}\nDescription: ${book.description}`
      );
      citations.push({
        sourceTitle: book.title,
        sourceType: "Catalog Metadata",
        referenceText: `Official catalog description: "${book.title}" by ${book.authors.join(", ")}`,
      });
    }
  }

  if (storeId) {
    const store = await Bookstore.findById(storeId).lean();
    if (store) {
      contextBlocks.push(
        `STORE POLICY:\nStore Name: ${store.name}\nPickup Hours: ${store.pickupHours}\nPolicy: ${store.storePolicy}\nHold Window: ${store.holdDurationHours} hours`
      );
      citations.push({
        sourceTitle: store.name,
        sourceType: "Store Policy",
        referenceText: `${store.name} pickup policy & hours`,
      });
    }
  }

  if (clubId) {
    const club = await Club.findById(clubId).lean();
    if (club) {
      contextBlocks.push(
        `CLUB GUIDELINES:\nClub Name: ${club.name}\nExpected Group Size: ${club.expectedGroupSize}\nSpoiler Policy: ${club.spoilerPolicy}\nDiscussion Rules: ${club.discussionRules}`
      );
    }
  }

  // Append retrieved chunk text
  topChunks.forEach((chunk, index) => {
    contextBlocks.push(
      `EXCERPT ${index + 1} (Chapter ${chunk.chapter || "N/A"}, Page ${chunk.pageNumber || "N/A"}):\n${chunk.chunkText}`
    );
    citations.push({
      sourceTitle: `Source Excerpt (Ch. ${chunk.chapter || "N/A"})`,
      sourceType: "Approved Excerpt",
      chapter: chunk.chapter,
      pageNumber: chunk.pageNumber,
      referenceText: chunk.chunkText.slice(0, 150) + "...",
    });
  });

  const combinedContext = contextBlocks.join("\n\n---\n\n");

  // 7. Compose LangChain messages with strict anti-hallucination prompt contract
  const messages = [
    new SystemMessage(`
You are the grounded, literary AI assistant for Independent Bookstore Discovery and Clubs.

Rules:
1. Answer the user's question using ONLY the supplied context (book metadata, store policies, and approved excerpts).
2. Do NOT invent plot points, character actions, store hours, inventory stock, or publications.
3. If the context does not contain enough information to answer truthfully, state clearly:
   "I could not find enough information in the authorized bookstore sources to answer this question."
4. Respect reading progress and spoiler boundaries: NEVER reveal plot developments beyond the authorized chapter.
5. Provide clear, concise, and book-focused answers with literary warmth.
`),
  ];

  // Append conversation history
  for (const msg of conversationHistory) {
    if (msg.role === "user") {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === "assistant") {
      messages.push(new AIMessage(msg.content));
    }
  }

  // Append grounded context and user question
  messages.push(
    new HumanMessage(`
AUTHORIZED CONTEXT:
${combinedContext || "No authorized excerpts or metadata found."}

USER QUESTION:
${standaloneQuery}
`)
  );

  // 8. Generate response using local chatModel (qwen3:8b)
  let answer = "";
  try {
    const aiResponse = await chatModel.invoke(messages);
    answer = typeof aiResponse.content === "string" ? aiResponse.content.trim() : "";
  } catch (err) {
    console.error(`[RAG Error] LLM generation failed: ${err.message}`);
    answer =
      "I am currently operating in offline mode. Based on our stored bookstore records: " +
      (contextBlocks.length > 0 ? contextBlocks[0].slice(0, 300) + "..." : "No records available.");
  }

  return {
    answer: answer || "I could not find enough information in the authorized bookstore sources to answer this question.",
    citations,
    spoilerBlocked: false,
  };
}
