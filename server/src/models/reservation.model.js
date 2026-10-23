import mongoose from "mongoose";

/**
 * Reservation model.
 * Tracks book hold lifecycle: confirmed -> collected OR (cancelled/expired).
 */
const reservationSchema = new mongoose.Schema(
  {
    readerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bookstore",
      required: true,
      index: true,
    },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },
    condition: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "collected", "cancelled", "expired"],
      default: "confirmed",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reservationSchema.index({ storeId: 1, status: 1 });
reservationSchema.index({ readerId: 1, status: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 });

export const Reservation = mongoose.model("Reservation", reservationSchema);
