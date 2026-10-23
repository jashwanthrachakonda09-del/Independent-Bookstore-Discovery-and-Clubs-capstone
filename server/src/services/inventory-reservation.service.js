import { Inventory } from "../models/inventory.model.js";
import { Reservation } from "../models/reservation.model.js";
import { Bookstore } from "../models/bookstore.model.js";
import { recordAuditEvent } from "./audit.service.js";

/**
 * Atomically reserve a book copy.
 * Ensures strict concurrency correctness: two readers cannot reserve the last copy simultaneously.
 */
export async function createReservation({
  readerId,
  bookId,
  storeId,
  condition = "new",
  format = "paperback",
  quantity = 1,
  idempotencyKey = null,
  ipAddress = "",
}) {
  // 1. Idempotency check: prevent duplicate reservation from repeated network requests
  if (idempotencyKey) {
    const existing = await Reservation.findOne({ idempotencyKey });
    if (existing) {
      return {
        reservation: existing,
        isExisting: true,
      };
    }
  }

  // 2. Lookup bookstore to obtain configured pickup and hold policy duration
  const store = await Bookstore.findById(storeId);
  if (!store || !store.isActive) {
    const error = new Error("Selected bookstore is not found or inactive.");
    error.statusCode = 404;
    throw error;
  }

  const holdDurationHours = store.holdDurationHours || 48;
  const expiresAt = new Date(Date.now() + holdDurationHours * 60 * 60 * 1000);

  // 3. Atomically check and reserve stock using conditional atomic update
  // Condition: (quantityOnHand - quantityReserved) >= quantity
  const updatedInventory = await Inventory.findOneAndUpdate(
    {
      bookId,
      storeId,
      condition,
      format,
      $expr: {
        $gte: [{ $subtract: ["$quantityOnHand", "$quantityReserved"] }, quantity],
      },
    },
    {
      $inc: { quantityReserved: quantity },
      updatedAt: new Date(),
    },
    { new: true }
  );

  // If update returned null, the stock was either 0 or taken by a concurrent request
  if (!updatedInventory) {
    const error = new Error(
      "Requested copy is no longer available in stock. Another reader may have reserved the last available copy."
    );
    error.statusCode = 409;
    throw error;
  }

  // 4. Create the confirmed reservation record
  let reservation;
  try {
    reservation = await Reservation.create({
      readerId,
      bookId,
      storeId,
      inventoryId: updatedInventory._id,
      quantity,
      condition,
      format,
      status: "confirmed",
      expiresAt,
      idempotencyKey: idempotencyKey || undefined,
    });
  } catch (creationError) {
    // Compensate / Rollback inventory reservation if record creation failed
    await Inventory.findByIdAndUpdate(updatedInventory._id, {
      $inc: { quantityReserved: -quantity },
    });
    throw creationError;
  }

  // 5. Audit log reservation creation
  await recordAuditEvent({
    actingUserId: readerId,
    action: "STOCK_ADJUSTMENT",
    entity: "Reservation",
    entityId: reservation._id,
    storeId,
    details: {
      type: "HOLD_CREATED",
      bookId,
      quantity,
      expiresAt,
    },
    ipAddress,
  });

  return {
    reservation,
    isExisting: false,
    pickupWindow: store.pickupHours,
    holdDurationHours,
  };
}

/**
 * Cancel an active reservation.
 * Restores available stock by decrementing quantityReserved.
 */
export async function cancelReservation({ reservationId, userId, reason = "", isStaff = false }) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const error = new Error("Reservation not found.");
    error.statusCode = 404;
    throw error;
  }

  // Readers can only cancel their own reservations; staff can cancel for store
  if (!isStaff && reservation.readerId.toString() !== userId.toString()) {
    const error = new Error("You do not have permission to cancel this reservation.");
    error.statusCode = 403;
    throw error;
  }

  if (reservation.status !== "confirmed") {
    const error = new Error(`Cannot cancel reservation with status: ${reservation.status}`);
    error.statusCode = 400;
    throw error;
  }

  // Atomically update reservation status
  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = reason || (isStaff ? "Cancelled by bookstore staff" : "Cancelled by reader");
  await reservation.save();

  // Atomically restore inventory stock (decrement quantityReserved)
  await Inventory.findByIdAndUpdate(reservation.inventoryId, {
    $inc: { quantityReserved: -reservation.quantity },
  });

  // Audit log cancellation
  await recordAuditEvent({
    actingUserId: userId,
    action: "RESERVATION_CANCELLED",
    entity: "Reservation",
    entityId: reservation._id,
    storeId: reservation.storeId,
    details: { reason: reservation.cancellationReason },
  });

  return reservation;
}

/**
 * Confirm pickup / collection of a reserved copy by an authorized bookseller.
 * Decrements both quantityOnHand and quantityReserved.
 */
export async function confirmCollection({ reservationId, booksellerId, storeId }) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    const error = new Error("Reservation not found.");
    error.statusCode = 404;
    throw error;
  }

  // Ensure reservation belongs to bookseller's authorized store
  if (storeId && reservation.storeId.toString() !== storeId.toString()) {
    const error = new Error("This reservation belongs to a different bookstore.");
    error.statusCode = 403;
    throw error;
  }

  if (reservation.status !== "confirmed") {
    const error = new Error(
      `Cannot collect reservation. Current status is ${reservation.status}. Expired or cancelled holds cannot be collected.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Mark reservation as collected
  reservation.status = "collected";
  reservation.collectedAt = new Date();
  await reservation.save();

  // Deduct physical inventory on hand and release reserved hold quantity
  await Inventory.findByIdAndUpdate(reservation.inventoryId, {
    $inc: {
      quantityOnHand: -reservation.quantity,
      quantityReserved: -reservation.quantity,
    },
  });

  // Audit log collection
  await recordAuditEvent({
    actingUserId: booksellerId,
    action: "RESERVATION_COLLECTED",
    entity: "Reservation",
    entityId: reservation._id,
    storeId: reservation.storeId,
    details: { quantityCollected: reservation.quantity },
  });

  return reservation;
}

/**
 * Server-side background job to cancel expired holds and restore available inventory.
 * Does not depend on the reader keeping their browser open.
 */
export async function expireHolds() {
  const now = new Date();
  const expiredReservations = await Reservation.find({
    status: "confirmed",
    expiresAt: { $lt: now },
  });

  let reconciledCount = 0;

  for (const res of expiredReservations) {
    try {
      res.status = "expired";
      res.cancelledAt = now;
      res.cancellationReason = "Hold expired after configured pickup window";
      await res.save();

      // Release reserved hold
      await Inventory.findByIdAndUpdate(res.inventoryId, {
        $inc: { quantityReserved: -res.quantity },
      });

      await recordAuditEvent({
        actingUserId: res.readerId,
        action: "HOLD_EXPIRED",
        entity: "Reservation",
        entityId: res._id,
        storeId: res.storeId,
        details: { quantityRestored: res.quantity },
      });

      reconciledCount++;
    } catch (err) {
      console.error(`[Hold Expiry Error] Failed to expire reservation ${res._id}:`, err.message);
    }
  }

  if (reconciledCount > 0) {
    console.log(`[Job] Expired ${reconciledCount} reservation holds and restored inventory.`);
  }

  return reconciledCount;
}

/**
 * Adjust store stock manually with mandatory audit reason.
 */
export async function adjustInventoryStock({
  bookId,
  storeId,
  condition,
  format,
  quantityOnHand,
  price,
  reason,
  userId,
}) {
  let inventory = await Inventory.findOne({ bookId, storeId, condition, format });

  const oldQuantity = inventory ? inventory.quantityOnHand : 0;

  if (!inventory) {
    inventory = await Inventory.create({
      bookId,
      storeId,
      condition,
      format,
      quantityOnHand,
      quantityReserved: 0,
      price: price || 0,
      updatedBy: userId,
    });
  } else {
    inventory.quantityOnHand = quantityOnHand;
    if (price !== undefined) inventory.price = price;
    inventory.updatedBy = userId;
    await inventory.save();
  }

  // Audit log stock update
  await recordAuditEvent({
    actingUserId: userId,
    action: "STOCK_ADJUSTMENT",
    entity: "Inventory",
    entityId: inventory._id,
    storeId,
    details: {
      bookId,
      condition,
      format,
      oldQuantity,
      newQuantity: quantityOnHand,
      reason,
    },
  });

  return inventory;
}
