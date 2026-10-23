import { embeddingModel } from "../config/ollama.config.js";
import { env } from "../config/env.config.js";

let lastOllamaCheck = 0;
let isOllamaAvailable = null;

async function checkIsOllamaAvailable() {
  const now = Date.now();
  if (isOllamaAvailable !== null && now - lastOllamaCheck < 15000) {
    return isOllamaAvailable;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    isOllamaAvailable = res.ok;
  } catch {
    isOllamaAvailable = false;
  }
  lastOllamaCheck = now;
  return isOllamaAvailable;
}

/**
 * Generate embedding vector for a single text query or document chunk.
 * Handles Ollama availability with graceful fallback.
 */
export async function generateQueryEmbedding(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error("A non-empty string is required to generate an embedding.");
  }

  const cleanText = text.trim();
  const available = await checkIsOllamaAvailable();

  if (available) {
    try {
      const vector = await embeddingModel.embedQuery(cleanText);
      return vector;
    } catch (error) {
      isOllamaAvailable = false;
      return generateDeterministicFallbackVector(cleanText, env.EMBEDDING_DIMENSION);
    }
  }

  // Fast deterministic pseudo-embedding fallback so tests and offline workflows run instantaneously
  return generateDeterministicFallbackVector(cleanText, env.EMBEDDING_DIMENSION);
}

/**
 * Generate embeddings for multiple document chunks in batch.
 */
export async function generateChunkEmbeddings(documentId, listOfChunks, metadata = {}) {
  if (!documentId || !Array.isArray(listOfChunks) || listOfChunks.length === 0) {
    throw new Error("Document ID and non-empty array of chunks are required.");
  }

  const results = [];

  for (let i = 0; i < listOfChunks.length; i++) {
    const chunk = listOfChunks[i];
    const chunkText = typeof chunk === "string" ? chunk.trim() : chunk.text?.trim();

    if (!chunkText) continue;

    const embedding = await generateQueryEmbedding(chunkText);

    results.push({
      documentId,
      chunkIndex: i,
      chunkText,
      embedding,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
      chapter: chunk.chapter || metadata.chapter || null,
      pageNumber: chunk.pageNumber || metadata.pageNumber || null,
      spoilerLevel: chunk.spoilerLevel || metadata.spoilerLevel || "none",
      bookId: metadata.bookId || null,
      storeId: metadata.storeId || null,
      clubId: metadata.clubId || null,
    });
  }

  return results;
}

/**
 * Fallback vector generator for when Ollama is offline or testing.
 * Produces a normalized, non-zero deterministic vector of dimension N.
 */
function generateDeterministicFallbackVector(text, dimension = 768) {
  const vector = new Array(dimension).fill(0);
  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
    const index = Math.abs(hash) % dimension;
    vector[index] = (vector[index] + 1) / (i + 1);
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((val) => val / magnitude);
}
