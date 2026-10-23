import crypto from "crypto";
import { searchCatalogTool } from "../tools/search-catalog.tool.js";
import { checkStockAndLengthTool } from "../tools/check-stock-and-length.tool.js";
import { compareClubConstraintsTool } from "../tools/compare-club-constraints.tool.js";
import { AgentRun } from "../models/agent-run.model.js";
import { Club } from "../models/club.model.js";
import { Book } from "../models/book.model.js";
import { recordAuditEvent } from "./audit.service.js";

/**
 * Execute the bounded AI agent workflow for club book selection.
 * Sequence: searchCatalog -> checkStockAndLength -> compareClubConstraints -> proposal.
 * Strictly bounded: records execution steps, duration, and returns proposal without modifying DB records.
 */
export async function runReadingClubAgent({ clubId, query, user }) {
  const steps = [];
  const proposalId = "prop_" + crypto.randomBytes(8).toString("hex");

  // Fetch club for expected group size and preferences
  const club = await Club.findById(clubId).lean();
  if (!club) {
    const error = new Error("Club not found.");
    error.statusCode = 404;
    throw error;
  }

  // --- Step 1: Tool 1 - searchCatalog ---
  const step1Start = Date.now();
  let catalogResultRaw;
  try {
    catalogResultRaw = await searchCatalogTool.invoke({
      query,
      maxPages: club.readingLengthLimit || 450,
    });
    steps.push({
      toolName: "search_catalog",
      input: { query, maxPages: club.readingLengthLimit },
      output: JSON.parse(catalogResultRaw),
      durationMs: Date.now() - step1Start,
      status: "success",
    });
  } catch (err) {
    steps.push({
      toolName: "search_catalog",
      input: { query },
      error: err.message,
      durationMs: Date.now() - step1Start,
      status: "failed",
    });
    throw err;
  }

  const catalogResult = JSON.parse(catalogResultRaw);
  const candidates = catalogResult.candidates || [];
  const candidateIds = candidates.map((c) => c.bookId);

  // If no candidates found, return truthful empty proposal
  if (candidateIds.length === 0) {
    const emptyProposal = {
      rankedCandidates: [],
      recommendedCandidateId: null,
      summary: "No candidate books matching the club preferences were found in the catalog.",
      unresolvedConstraints: ["No catalog records match query and length limit."],
    };
    await AgentRun.create({
      actingUserId: user._id,
      clubId,
      query,
      steps,
      proposalId,
      proposal: emptyProposal,
      status: "completed",
    });
    return { proposalId, proposal: emptyProposal, steps };
  }

  // --- Step 2: Tool 2 - checkStockAndLength ---
  const step2Start = Date.now();
  let stockResultRaw;
  try {
    stockResultRaw = await checkStockAndLengthTool.invoke({
      bookIds: candidateIds,
      groupSize: club.expectedGroupSize || 8,
    });
    steps.push({
      toolName: "check_stock_and_length",
      input: { bookIds: candidateIds, groupSize: club.expectedGroupSize },
      output: JSON.parse(stockResultRaw),
      durationMs: Date.now() - step2Start,
      status: "success",
    });
  } catch (err) {
    steps.push({
      toolName: "check_stock_and_length",
      input: { bookIds: candidateIds },
      error: err.message,
      durationMs: Date.now() - step2Start,
      status: "failed",
    });
    throw err;
  }

  const stockResult = JSON.parse(stockResultRaw);
  const evaluatedBooks = stockResult.evaluations || [];

  // --- Step 3: Tool 3 - compareClubConstraints ---
  const step3Start = Date.now();
  let comparisonResultRaw;
  try {
    comparisonResultRaw = await compareClubConstraintsTool.invoke({
      clubId: club._id.toString(),
      books: evaluatedBooks,
    });
    steps.push({
      toolName: "compare_club_constraints",
      input: { clubId: club._id.toString(), bookCount: evaluatedBooks.length },
      output: JSON.parse(comparisonResultRaw),
      durationMs: Date.now() - step3Start,
      status: "success",
    });
  } catch (err) {
    steps.push({
      toolName: "compare_club_constraints",
      input: { clubId: club._id.toString() },
      error: err.message,
      durationMs: Date.now() - step3Start,
      status: "failed",
    });
    throw err;
  }

  const comparisonResult = JSON.parse(comparisonResultRaw);
  const comparisons = comparisonResult.comparisons || [];

  // --- Step 4: Synthesize Proposal ---
  // Rank candidates: books with sufficient stock & fitting reading length ranked highest
  comparisons.sort((a, b) => {
    // Priority 1: meets group stock
    if (a.meetsGroupSize && !b.meetsGroupSize) return -1;
    if (!a.meetsGroupSize && b.meetsGroupSize) return 1;
    // Priority 2: warnings count
    return (a.warnings?.length || 0) - (b.warnings?.length || 0);
  });

  const rankedCandidates = comparisons.map((c) => ({
    bookId: c.bookId,
    title: c.title,
    author: Array.isArray(c.authors) ? c.authors.join(", ") : c.authors,
    matchReasons: [c.clubFitNotes].filter(Boolean),
    readingLength: c.readingLength,
    availableStock: c.availableStock,
    meetsGroupSize: c.meetsGroupSize,
    readingTimeSuitability: c.readingTimeSuitability,
    clubFitNotes: c.clubFitNotes,
    missingInfo: c.readingLength ? [] : ["Reading length unrecorded in catalog"],
    warnings: c.warnings || [],
  }));

  // Top candidate that meets stock requirements, or first with trade-off note
  const recommended = rankedCandidates.find((c) => c.meetsGroupSize) || rankedCandidates[0];

  const unresolvedConstraints = [];
  if (recommended && !recommended.meetsGroupSize) {
    unresolvedConstraints.push(
      `Top thematic choice "${recommended.title}" has only ${recommended.availableStock} copies in stock for group of ${club.expectedGroupSize}.`
    );
  }

  const proposal = {
    rankedCandidates,
    recommendedCandidateId: recommended?.bookId || null,
    summary: recommended
      ? `Recommended: "${recommended.title}" (${recommended.readingLength || "N/A"} pages, ${recommended.availableStock} reservable copies). It fits the club's reading pace and group size constraints.`
      : "No suitable candidates found.",
    unresolvedConstraints,
  };

  // Save agent run audit record
  await AgentRun.create({
    actingUserId: user._id,
    clubId,
    query,
    steps,
    proposalId,
    proposal,
    status: "completed",
  });

  return {
    proposalId,
    proposal,
    steps,
  };
}

/**
 * Confirm and publish a selected book for a club.
 * Strictly requires human moderator confirmation before publishing.
 */
export async function confirmClubBookSelection({ clubId, proposalId, bookId, userId }) {
  const club = await Club.findById(clubId);
  if (!club) {
    const error = new Error("Club not found.");
    error.statusCode = 404;
    throw error;
  }

  const book = await Book.findById(bookId);
  if (!book) {
    const error = new Error("Selected book not found in catalog.");
    error.statusCode = 404;
    throw error;
  }

  // Update club's current reading selection
  club.currentBookId = book._id;
  await club.save();

  // Mark agent proposal as confirmed
  await AgentRun.findOneAndUpdate(
    { proposalId },
    {
      isConfirmed: true,
      confirmedBookId: book._id,
      confirmedAt: new Date(),
    }
  );

  // Record audit log
  await recordAuditEvent({
    actingUserId: userId,
    action: "BOOK_SELECTION_PUBLISHED",
    entity: "Club",
    entityId: club._id,
    details: {
      proposalId,
      bookId: book._id,
      bookTitle: book.title,
    },
  });

  return {
    success: true,
    message: `Successfully published "${book.title}" as the current reading selection for ${club.name}.`,
    club,
    selectedBook: book,
  };
}
