import express from "express";
import { Inventory } from "../models/inventory.model.js";
import { Reservation } from "../models/reservation.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireBookseller } from "../middleware/rbac.middleware.js";

export const booksellerRouter = express.Router();

/**
 * Retrieve inventory for current bookseller's authorized store.
 * URL: GET /api/bookseller/inventory
 */
booksellerRouter.get("/inventory", requireAuth, requireBookseller(), async (req, res, next) => {
  try {
    const storeId = req.booksellerStoreId;

    const inventory = await Inventory.find(storeId ? { storeId } : {})
      .populate("bookId", "title authors isbn coverImage readingLength readingLengthUnit genres")
      .populate("storeId", "name address")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { inventory },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve reservations for current bookseller's authorized store.
 * URL: GET /api/bookseller/reservations
 */
booksellerRouter.get("/reservations", requireAuth, requireBookseller(), async (req, res, next) => {
  try {
    const storeId = req.booksellerStoreId;
    const filter = storeId ? { storeId } : {};

    const reservations = await Reservation.find(filter)
      .populate("bookId", "title authors coverImage readingLength")
      .populate("readerId", "name email")
      .populate("storeId", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { reservations },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve current bookseller's store details.
 * URL: GET /api/bookseller/store
 */
booksellerRouter.get("/store", requireAuth, requireBookseller(), async (req, res, next) => {
  try {
    const store = await Bookstore.findById(req.booksellerStoreId).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: "Authorized bookstore not found." });
    }

    res.status(200).json({
      success: true,
      data: { store },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update pickup windows and store policies.
 * URL: POST /api/bookseller/policy
 */
booksellerRouter.post("/policy", requireAuth, requireBookseller(), async (req, res, next) => {
  try {
    const { storePolicy, pickupHours, holdDurationHours } = req.body;
    const store = await Bookstore.findById(req.booksellerStoreId);

    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found." });
    }

    if (storePolicy) store.storePolicy = storePolicy;
    if (pickupHours) store.pickupHours = pickupHours;
    if (holdDurationHours) store.holdDurationHours = Number(holdDurationHours);

    await store.save();

    res.status(200).json({
      success: true,
      message: "Store policy and pickup window updated.",
      data: { store },
    });
  } catch (error) {
    next(error);
  }
});
