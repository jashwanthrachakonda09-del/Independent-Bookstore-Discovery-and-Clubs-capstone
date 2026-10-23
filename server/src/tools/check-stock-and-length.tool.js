import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Inventory } from "../models/inventory.model.js";
import { Book } from "../models/book.model.js";

/**
 * Tool 2: checkStockAndLength
 * Checks real database inventory and reading length for candidate books.
 * Determines if available copies across independent stores satisfy the group size.
 */
export const checkStockAndLengthTool = tool(
  async ({ bookIds, groupSize = 8 }) => {
    if (!Array.isArray(bookIds) || bookIds.length === 0) {
      return JSON.stringify({ error: "At least one bookId is required." });
    }

    const results = [];

    for (const bookId of bookIds) {
      const book = await Book.findById(bookId).lean();
      if (!book) continue;

      const inventoryRecords = await Inventory.find({ bookId })
        .populate("storeId", "name")
        .lean();

      let totalOnHand = 0;
      let totalReserved = 0;
      let totalAvailable = 0;

      const storeStock = inventoryRecords.map((inv) => {
        const avail = Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
        totalOnHand += inv.quantityOnHand || 0;
        totalReserved += inv.quantityReserved || 0;
        totalAvailable += avail;
        return {
          storeName: inv.storeId?.name || "Independent Bookstore",
          condition: inv.condition,
          format: inv.format,
          quantityOnHand: inv.quantityOnHand,
          available: avail,
        };
      });

      const meetsGroupSize = totalAvailable >= groupSize;
      const missingLength = !book.readingLength;

      results.push({
        bookId: book._id.toString(),
        title: book.title,
        authors: book.authors,
        readingLength: book.readingLength || null,
        readingLengthUnit: book.readingLengthUnit || "pages",
        totalAvailableStock: totalAvailable,
        totalOnHand,
        totalReserved,
        meetsGroupSize,
        groupSizeRequested: groupSize,
        storeBreakdown: storeStock,
        missingInfo: missingLength ? ["Reading length unrecorded in catalog"] : [],
      });
    }

    return JSON.stringify({
      groupSize,
      evaluations: results,
    });
  },
  {
    name: "check_stock_and_length",
    description: "Check actual database inventory and reading length for a list of book IDs, verifying if sufficient copies exist for the group size.",
    schema: z.object({
      bookIds: z.array(z.string()).describe("Array of Book ID strings to inspect"),
      groupSize: z.number().describe("Expected number of club members who need a copy"),
    }),
  }
);
