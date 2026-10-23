import express from "express";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { updateReaderProgress } from "../services/reading-progress.service.js";
import { updateProgressSchema } from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const readingProgressRouter = express.Router();

/**
 * Retrieve authenticated reader's reading progress and spoiler settings.
 * Readers cannot view another reader's private progress.
 * URL: GET /api/reading-progress
 */
readingProgressRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const bookId = req.query.bookId;
    const query = { readerId: req.user._id };
    if (bookId) query.bookId = bookId;

    const progressRecords = await ReadingProgress.find(query)
      .populate("bookId", "title authors coverImage readingLength readingLengthUnit")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        progress: bookId ? progressRecords[0] || null : progressRecords,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update reader's progress, chapter/page checkpoints, and spoiler mode.
 * URL: PATCH /api/reading-progress
 */
readingProgressRouter.patch("/", requireAuth, async (req, res, next) => {
  try {
    const validatedData = updateProgressSchema.parse(req.body);
    const updatedProgress = await updateReaderProgress(req.user._id, validatedData);

    res.status(200).json({
      success: true,
      message: "Reading progress and spoiler boundary updated.",
      data: { progress: updatedProgress },
    });
  } catch (error) {
    next(error);
  }
});
