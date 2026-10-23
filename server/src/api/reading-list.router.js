import express from "express";
import { ReadingList } from "../models/reading-list.model.js";
import { createReadingListSchema, addToListSchema } from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const readingListRouter = express.Router();

/**
 * List authenticated reader's reading lists.
 * URL: GET /api/reading-lists
 */
readingListRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const lists = await ReadingList.find({ ownerId: req.user._id })
      .populate("books.bookId", "title authors coverImage readingLength")
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { readingLists: lists },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new personal reading list.
 * URL: POST /api/reading-lists
 */
readingListRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const validatedData = createReadingListSchema.parse(req.body);

    const list = await ReadingList.create({
      ...validatedData,
      ownerId: req.user._id,
      books: [],
    });

    res.status(201).json({
      success: true,
      message: "Reading list created.",
      data: { readingList: list },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve an authorized reading list.
 * URL: GET /api/reading-lists/:id
 */
readingListRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findById(req.params.id)
      .populate("books.bookId", "title authors coverImage readingLength description genres")
      .lean();

    if (!list) {
      return res.status(404).json({ success: false, message: "Reading list not found." });
    }

    // Access check: owner only, unless visibility is explicitly public
    if (list.ownerId.toString() !== req.user._id.toString() && list.visibility !== "public") {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this private reading list.",
      });
    }

    res.status(200).json({
      success: true,
      data: { readingList: list },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update reading list metadata.
 * URL: PATCH /api/reading-lists/:id
 */
readingListRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!list) {
      return res.status(404).json({ success: false, message: "Reading list not found or unauthorized." });
    }

    const { name, description, visibility } = req.body;
    if (name) list.name = name;
    if (description !== undefined) list.description = description;
    if (visibility) list.visibility = visibility;

    await list.save();

    res.status(200).json({
      success: true,
      message: "Reading list updated.",
      data: { readingList: list },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a personal reading list.
 * URL: DELETE /api/reading-lists/:id
 */
readingListRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!list) {
      return res.status(404).json({ success: false, message: "Reading list not found or unauthorized." });
    }

    if (list.isDefaultSystemList) {
      return res.status(400).json({
        success: false,
        message: "Default system reading lists cannot be deleted.",
      });
    }

    await ReadingList.deleteOne({ _id: list._id });

    res.status(200).json({
      success: true,
      message: "Reading list deleted.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add a book to a reading list.
 * URL: POST /api/reading-lists/:id/books
 */
readingListRouter.post("/:id/books", requireAuth, async (req, res, next) => {
  try {
    const { bookId, notes } = addToListSchema.parse(req.body);
    const list = await ReadingList.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!list) {
      return res.status(404).json({ success: false, message: "Reading list not found or unauthorized." });
    }

    const alreadyInList = list.books.some((b) => b.bookId.toString() === bookId);
    if (alreadyInList) {
      return res.status(400).json({ success: false, message: "Book is already in this list." });
    }

    list.books.push({
      bookId,
      notes: notes || "",
      order: list.books.length,
      addedAt: new Date(),
    });

    await list.save();

    res.status(200).json({
      success: true,
      message: "Book added to list.",
      data: { readingList: list },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Remove a book from a reading list.
 * URL: DELETE /api/reading-lists/:id/books/:bookId
 */
readingListRouter.delete("/:id/books/:bookId", requireAuth, async (req, res, next) => {
  try {
    const list = await ReadingList.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!list) {
      return res.status(404).json({ success: false, message: "Reading list not found or unauthorized." });
    }

    list.books = list.books.filter((b) => b.bookId.toString() !== req.params.bookId);
    await list.save();

    res.status(200).json({
      success: true,
      message: "Book removed from list.",
      data: { readingList: list },
    });
  } catch (error) {
    next(error);
  }
});
