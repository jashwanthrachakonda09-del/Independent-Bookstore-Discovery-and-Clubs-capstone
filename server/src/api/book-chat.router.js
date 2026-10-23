import express from "express";
import { Conversation } from "../models/conversation.model.js";
import { generateSpoilerAwareRagAnswer } from "../services/spoiler-aware-rag.service.js";
import { bookChatSchema } from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const bookChatRouter = express.Router();

// Require authenticated reader for book chat
bookChatRouter.use(requireAuth);

/**
 * Send a message to the spoiler-aware book discovery and club assistant.
 * URL: POST /api/book-chat
 */
bookChatRouter.post("/", async (req, res, next) => {
  try {
    const validatedData = bookChatSchema.parse(req.body);
    const { query, bookId, clubId, conversationId } = validatedData;

    let conversation;

    // Load or create conversation
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id,
      });
    }

    if (!conversation) {
      conversation = await Conversation.create({
        userId: req.user._id,
        bookId: bookId || null,
        clubId: clubId || null,
        title: query.slice(0, 40) + (query.length > 40 ? "..." : ""),
        messages: [],
      });
    }

    // Append user question
    conversation.messages.push({
      role: "user",
      content: query,
      timestamp: new Date(),
    });

    // Extract prior message history for query rewriting
    const history = conversation.messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Generate grounded RAG answer
    const ragResult = await generateSpoilerAwareRagAnswer({
      user: req.user,
      query,
      bookId: bookId || conversation.bookId,
      clubId: clubId || conversation.clubId,
      conversationHistory: history.slice(0, -1), // exclude current message
    });

    // Append assistant answer
    conversation.messages.push({
      role: "assistant",
      content: ragResult.answer,
      citations: ragResult.citations || [],
      timestamp: new Date(),
    });

    await conversation.save();

    res.status(200).json({
      success: true,
      data: {
        conversationId: conversation._id,
        answer: ragResult.answer,
        citations: ragResult.citations,
        spoilerBlocked: ragResult.spoilerBlocked || false,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * List reader's chat conversations.
 * URL: GET /api/book-chat/conversations
 */
bookChatRouter.get("/conversations", async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .populate("bookId", "title coverImage")
      .populate("clubId", "name")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { conversations },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve a specific conversation with all message turns and citations.
 * URL: GET /api/book-chat/conversations/:id
 */
bookChatRouter.get("/conversations/:id", async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    })
      .populate("bookId", "title authors coverImage readingLength")
      .populate("clubId", "name")
      .lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
});
