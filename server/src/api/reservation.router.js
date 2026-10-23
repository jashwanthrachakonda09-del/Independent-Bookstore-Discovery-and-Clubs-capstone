import express from "express";
import { Reservation } from "../models/reservation.model.js";
import {
  createReservation,
  cancelReservation,
  confirmCollection,
} from "../services/inventory-reservation.service.js";
import { createReservationSchema } from "../validators/schemas.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireEmailVerified, requireBookseller } from "../middleware/rbac.middleware.js";

export const reservationRouter = express.Router();

/**
 * Create a reservation after explicit reader confirmation.
 * URL: POST /api/books/:id/reservations
 */
reservationRouter.post(
  "/books/:id/reservations",
  requireAuth,
  requireEmailVerified,
  async (req, res, next) => {
    try {
      const validatedData = createReservationSchema.parse(req.body);
      const ipAddress = req.ip || req.connection.remoteAddress;

      const result = await createReservation({
        readerId: req.user._id,
        bookId: req.params.id,
        storeId: validatedData.storeId,
        condition: validatedData.condition,
        format: validatedData.format,
        quantity: validatedData.quantity,
        idempotencyKey: validatedData.idempotencyKey,
        ipAddress,
      });

      res.status(201).json({
        success: true,
        message: result.isExisting
          ? "Reservation already exists."
          : `Reservation confirmed! Please collect within ${result.holdDurationHours} hours.`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * List current authenticated reader's reservations.
 * Readers cannot view other readers' reservations.
 * URL: GET /api/reservations
 */
reservationRouter.get("/reservations", requireAuth, async (req, res, next) => {
  try {
    const reservations = await Reservation.find({ readerId: req.user._id })
      .populate("bookId", "title authors coverImage readingLength")
      .populate("storeId", "name address contactPhone pickupHours")
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
 * View an authorized reservation.
 * URL: GET /api/reservations/:id
 */
reservationRouter.get("/reservations/:id", requireAuth, async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate("bookId", "title authors coverImage readingLength")
      .populate("storeId", "name address contactPhone pickupHours storePolicy")
      .lean();

    if (!reservation) {
      return res.status(404).json({ success: false, message: "Reservation not found." });
    }

    // Access check: only reservation owner or staff can view
    const isOwner = reservation.readerId.toString() === req.user._id.toString();
    if (!isOwner && !req.user.isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this reservation.",
      });
    }

    res.status(200).json({
      success: true,
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Cancel an eligible reservation.
 * URL: POST /api/reservations/:id/cancel
 */
reservationRouter.post("/reservations/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const reservation = await cancelReservation({
      reservationId: req.params.id,
      userId: req.user._id,
      reason,
      isStaff: req.user.isSystemAdmin,
    });

    res.status(200).json({
      success: true,
      message: "Reservation successfully cancelled and stock restored.",
      data: { reservation },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Confirm pickup / collection by authorized bookseller.
 * URL: POST /api/reservations/:id/collection
 */
reservationRouter.post(
  "/reservations/:id/collection",
  requireAuth,
  requireBookseller(),
  async (req, res, next) => {
    try {
      const reservation = await confirmCollection({
        reservationId: req.params.id,
        booksellerId: req.user._id,
        storeId: req.booksellerStoreId,
      });

      res.status(200).json({
        success: true,
        message: "Reservation marked as collected.",
        data: { reservation },
      });
    } catch (error) {
      next(error);
    }
  }
);
