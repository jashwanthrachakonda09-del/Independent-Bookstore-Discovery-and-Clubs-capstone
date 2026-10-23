import { ReadingList } from "../models/reading-list.model.js";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { Book } from "../models/book.model.js";

/**
 * Initialize default reading lists for a newly registered reader.
 */
export async function initializeDefaultReadingLists(userId) {
  const defaultLists = [
    { name: "Want to Read", description: "Books you want to read next." },
    { name: "Currently Reading", description: "Books you are actively reading." },
    { name: "Finished", description: "Books you have completed." },
    { name: "Favorites", description: "Your all-time favorite independent bookstore discoveries." },
    { name: "Club Reading Queue", description: "Books selected for your reading clubs." },
  ];

  for (const list of defaultLists) {
    await ReadingList.findOneAndUpdate(
      { ownerId: userId, name: list.name },
      { ...list, ownerId: userId, visibility: "private", isDefaultSystemList: true },
      { upsert: true, new: true }
    );
  }
}

/**
 * Get or create reading progress for a reader on a specific book.
 */
export async function getReaderProgress(readerId, bookId) {
  let progress = await ReadingProgress.findOne({ readerId, bookId });
  if (!progress) {
    progress = await ReadingProgress.create({
      readerId,
      bookId,
      status: "want_to_read",
      currentPage: 0,
      currentChapter: 0,
      spoilerMode: "spoiler_free",
      maximumPermittedChapter: 1,
      visibility: "private",
    });
  }
  return progress;
}

/**
 * Update reading progress and spoiler preferences.
 * Validates progress against known book metadata.
 */
export async function updateReaderProgress(readerId, updateData) {
  const {
    bookId,
    status,
    currentPage,
    currentChapter,
    spoilerMode,
    maximumPermittedChapter,
    maximumPermittedPage,
    visibility,
    privateNotes,
  } = updateData;

  const book = await Book.findById(bookId);
  if (!book) {
    const error = new Error("Book not found.");
    error.statusCode = 404;
    throw error;
  }

  // Validate page count if book has reading length metadata
  if (currentPage !== undefined && book.readingLength && book.readingLengthUnit === "pages") {
    if (currentPage > book.readingLength) {
      const error = new Error(
        `Current page (${currentPage}) cannot exceed total book pages (${book.readingLength}).`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const progress = await ReadingProgress.findOneAndUpdate(
    { readerId, bookId },
    {
      ...(status && { status }),
      ...(currentPage !== undefined && { currentPage }),
      ...(currentChapter !== undefined && { currentChapter }),
      ...(spoilerMode && { spoilerMode }),
      ...(maximumPermittedChapter !== undefined && { maximumPermittedChapter }),
      ...(maximumPermittedPage !== undefined && { maximumPermittedPage }),
      ...(visibility && { visibility }),
      ...(privateNotes !== undefined && { privateNotes }),
      ...(status === "completed" && { completedAt: new Date() }),
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return progress;
}
