import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Club } from "../models/club.model.js";
import { Meeting } from "../models/meeting.model.js";

/**
 * Tool 3: compareClubConstraints
 * Evaluates candidate books against club preferences, expected group size, meeting schedule, and reading limits.
 */
export const compareClubConstraintsTool = tool(
  async ({ clubId, books }) => {
    const club = await Club.findById(clubId).lean();
    if (!club) {
      return JSON.stringify({ error: "Club not found." });
    }

    // Check for next upcoming meeting
    const upcomingMeeting = await Meeting.findOne({
      clubId,
      status: "upcoming",
      scheduledAt: { $gte: new Date() },
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const daysUntilMeeting = upcomingMeeting
      ? Math.max(1, Math.ceil((new Date(upcomingMeeting.scheduledAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 14; // Default to 2 weeks if no scheduled meeting

    const comparisons = [];

    for (const b of books) {
      const matchGenre = (club.genres || []).some((g) =>
        (b.genres || []).some((bg) => bg.toLowerCase().includes(g.toLowerCase()))
      );
      const matchTheme = (club.themes || []).some((t) =>
        (b.themes || []).some((bt) => bt.toLowerCase().includes(t.toLowerCase()))
      );

      // Check reading length limit
      const lengthFit =
        b.readingLength && club.readingLengthLimit ? b.readingLength <= club.readingLengthLimit : true;

      // Calculate pages per day required
      const pagesPerDay = b.readingLength ? Math.ceil(b.readingLength / daysUntilMeeting) : null;

      // Stock check
      const stockOk = b.meetsGroupSize !== false;

      const warnings = [];
      if (!stockOk) {
        warnings.push(`Insufficient stock: only ${b.totalAvailableStock || 0} copies available for group size of ${club.expectedGroupSize}`);
      }
      if (b.readingLength && club.readingLengthLimit && b.readingLength > club.readingLengthLimit) {
        warnings.push(`Exceeds club reading limit of ${club.readingLengthLimit} pages (book has ${b.readingLength} pages)`);
      }
      if (!b.readingLength) {
        warnings.push("Reading length is unrecorded in catalog metadata");
      }

      comparisons.push({
        bookId: b.bookId,
        title: b.title,
        authors: b.authors,
        readingLength: b.readingLength,
        availableStock: b.totalAvailableStock || 0,
        meetsGroupSize: stockOk,
        genreFit: matchGenre,
        themeFit: matchTheme,
        readingTimeSuitability: pagesPerDay
          ? `${pagesPerDay} pages/day needed over ${daysUntilMeeting} days until meeting`
          : "Unknown reading pace",
        clubFitNotes: matchGenre || matchTheme ? "Strong thematic match with club preferences" : "Explores new genres outside club defaults",
        warnings,
      });
    }

    return JSON.stringify({
      clubName: club.name,
      expectedGroupSize: club.expectedGroupSize,
      readingLengthLimit: club.readingLengthLimit,
      daysUntilMeeting,
      comparisons,
    });
  },
  {
    name: "compare_club_constraints",
    description: "Compare shortlisted books against a specific club's preferences, group size, and meeting schedule.",
    schema: z.object({
      clubId: z.string().describe("Club ID to evaluate against"),
      books: z.array(z.any()).describe("List of candidate books with stock and length data"),
    }),
  }
);
