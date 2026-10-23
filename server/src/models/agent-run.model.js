import mongoose from "mongoose";

/**
 * Agent Run model.
 * Records the bounded execution trail of the AI club selection agent.
 * Exposes inputs, tool calls, and structured proposals without leaking secret prompts.
 */
const agentRunSchema = new mongoose.Schema(
  {
    actingUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
    },
    steps: [
      {
        toolName: { type: String, required: true },
        input: { type: mongoose.Schema.Types.Mixed },
        output: { type: mongoose.Schema.Types.Mixed },
        durationMs: { type: Number, default: 0 },
        status: { type: String, enum: ["success", "failed"], default: "success" },
        error: { type: String, default: null },
      },
    ],
    proposalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    proposal: {
      rankedCandidates: [
        {
          bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
          title: String,
          author: String,
          matchReasons: [String],
          readingLength: Number,
          availableStock: Number,
          meetsGroupSize: Boolean,
          readingTimeSuitability: String,
          clubFitNotes: String,
          missingInfo: [String],
        },
      ],
      recommendedCandidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
      summary: String,
      unresolvedConstraints: [String],
    },
    isConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    confirmedBookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "completed",
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AgentRun = mongoose.model("AgentRun", agentRunSchema);
