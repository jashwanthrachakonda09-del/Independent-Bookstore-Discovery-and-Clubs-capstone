import express from "express";
import { Book } from "../models/book.model.js";
import { Inventory } from "../models/inventory.model.js";
import { searchCatalog } from "../services/catalog-search.service.js";
import { adjustInventoryStock } from "../services/inventory-reservation.service.js";
import { bookQuerySchema, updateStockSchema } from "../validators/schemas.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";
import { requireBookseller } from "../middleware/rbac.middleware.js";

export const bookRouter = express.Router();

/**
 * Public book discovery with natural language semantic search and deterministic filters.
 * URL: GET /api/books
 */
bookRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const validatedQuery = bookQuerySchema.parse(req.query);
    const result = await searchCatalog(validatedQuery);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve public book detail with store-specific physical inventory summary.
 * URL: GET /api/books/:id
 */
bookRouter.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found." });
    }

    // Populate actual physical inventory records for participating independent bookstores
    const inventoryRecords = await Inventory.find({ bookId: book._id })
      .populate("storeId", "name slug address contactPhone pickupHours holdDurationHours storePolicy")
      .lean();

    let totalAvailable = 0;
    const storeBreakdown = inventoryRecords.map((inv) => {
      const avail = Math.max(0, (inv.quantityOnHand || 0) - (inv.quantityReserved || 0));
      totalAvailable += avail;
      return {
        inventoryId: inv._id,
        store: inv.storeId,
        condition: inv.condition,
        format: inv.format,
        quantityOnHand: inv.quantityOnHand,
        quantityReserved: inv.quantityReserved,
        availableQuantity: avail,
        price: inv.price,
        pickupWindows: inv.pickupWindows,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        book,
        inventory: {
          totalAvailable,
          isReservable: totalAvailable > 0,
          stores: storeBreakdown,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update authorized store inventory for a book.
 * Restricted to authorized bookseller for the target store.
 * URL: PATCH /api/books/:id/stock
 */
bookRouter.patch(
  "/:id/stock",
  requireAuth,
  requireBookseller((req) => req.body.storeId),
  async (req, res, next) => {
    try {
      const validatedData = updateStockSchema.parse(req.body);
      const storeId = req.body.storeId || req.booksellerStoreId;

      if (!storeId) {
        return res.status(400).json({ success: false, message: "Store ID is required for stock updates." });
      }

      const updatedInventory = await adjustInventoryStock({
        bookId: req.params.id,
        storeId,
        condition: validatedData.condition,
        format: validatedData.format,
        quantityOnHand: validatedData.quantityOnHand,
        price: validatedData.price,
        reason: validatedData.reason,
        userId: req.user._id,
      });

      res.status(200).json({
        success: true,
        message: "Store inventory updated successfully.",
        data: { inventory: updatedInventory },
      });
    } catch (error) {
      next(error);
    }
  }
);
