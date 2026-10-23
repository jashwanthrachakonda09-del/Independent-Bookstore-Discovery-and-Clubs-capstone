import { chatModel } from "../config/ollama.config.js";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

/**
 * Convert a context-dependent follow-up question into an independently understandable search query.
 * Following Rajesh Thappeta's pattern from mern-ai-integration-patterns.
 */
export async function generateStandaloneQuery(currentQuery, conversationHistory = []) {
  if (typeof currentQuery !== "string" || currentQuery.trim() === "") {
    throw new Error("A non-empty query is required.");
  }

  const normalizedQuery = currentQuery.trim();

  // If there's no conversation history, the query is already standalone
  if (!conversationHistory || conversationHistory.length === 0) {
    return normalizedQuery;
  }

  const messages = [
    new SystemMessage(`
You rewrite follow-up questions about books, bookstores, or reading clubs into standalone search queries.

Use the conversation history only to understand references such as "it", "they", "that book", "the first one", and omitted subjects.

Rules:
1. Preserve the user's original meaning and search intent.
2. Do not answer the question.
3. Do not add facts or opinions that are not present in the conversation.
4. Return only the rewritten standalone query.
5. Do not include labels, quotation marks, or conversational commentary.
`),
  ];

  // Add previous messages using their original roles
  for (const message of conversationHistory) {
    if (message.role === "user") {
      messages.push(new HumanMessage(message.content));
    } else if (message.role === "assistant") {
      messages.push(new AIMessage(message.content));
    }
  }

  // Add the current follow-up question
  messages.push(
    new HumanMessage(
      `Rewrite this follow-up question as a standalone search query: ${normalizedQuery}`
    )
  );

  try {
    const response = await chatModel.invoke(messages);
    const content = typeof response.content === "string" ? response.content.trim() : "";
    return content || normalizedQuery;
  } catch (error) {
    console.warn(`[Query Rewriting Warning] LLM rewriting failed: ${error.message}. Using original query.`);
    return normalizedQuery;
  }
}
