import mongoose from "mongoose";

/**
 * Store-specific Inventory model.
 * Enforces non-negative quantities and calculates real available stock:
 * availableQuantity = quantityOnHand - quantityReserved
 */
const inventorySchema = new mongoose.Schema(
  {
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
    condition: {
      type: String,
      enum: ["new", "used_like_new", "used_good", "used_acceptable", "collector"],
      default: "new",
      index: true,
    },
    format: {
      type: String,
      enum: ["paperback", "hardcover", "audiobook", "ebook", "signed_edition"],
      default: "paperback",
      index: true,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      min: [0, "Quantity on hand cannot be negative"],
      default: 0,
    },
    quantityReserved: {
      type: Number,
      required: true,
      min: [0, "Quantity reserved cannot be negative"],
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
    },
    pickupWindows: {
      type: String,
      default: "Ready for pickup within 2 hours during store business hours.",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual field: availableQuantity
inventorySchema.virtual("availableQuantity").get(function () {
  return Math.max(0, (this.quantityOnHand || 0) - (this.quantityReserved || 0));
});

// Compound unique index ensuring one record per condition/format at a store
inventorySchema.index(
  { bookId: 1, storeId: 1, condition: 1, format: 1 },
  { unique: true }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);
