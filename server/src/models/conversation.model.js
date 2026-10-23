import mongoose from "mongoose";

/**
 * Message sub-schema in a persistent conversation.
 */
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: [
      {
        sourceTitle: String,
        sourceType: String,
        chapter: Number,
        pageNumber: Number,
        referenceText: String,
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

/**
 * Conversation model for persistent book assistant and club chats.
 */
const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
      index: true,
    },
    title: {
      type: String,
      default: "Book Discovery Chat",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
