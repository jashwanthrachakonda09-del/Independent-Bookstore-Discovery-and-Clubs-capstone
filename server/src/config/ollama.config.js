import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { env } from "./env.config.js";

/**
 * Configure the Ollama embedding model.
 * Matches local model: nomic-embed-text:latest (768 dimensions) or qwen3-embedding:4b
 */
export const embeddingModel = new OllamaEmbeddings({
  model: env.OLLAMA_EMBEDDING_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
});

/**
 * Configure the Ollama chat & agent model.
 * Matches local model: qwen3:8b
 */
export const chatModel = new ChatOllama({
  model: env.OLLAMA_CHAT_MODEL,
  baseUrl: env.OLLAMA_BASE_URL,
  temperature: 0,
});

/**
 * Check if the Ollama service is reachable and has the expected models.
 */
export async function checkOllamaHealth() {
  try {
    const response = await fetch(`${env.OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }
    const data = await response.json();
    const modelNames = (data.models || []).map((m) => m.name);
    return {
      available: true,
      models: modelNames,
      chatModel: env.OLLAMA_CHAT_MODEL,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
      embeddingDimension: env.EMBEDDING_DIMENSION,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      chatModel: env.OLLAMA_CHAT_MODEL,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
    };
  }
}
