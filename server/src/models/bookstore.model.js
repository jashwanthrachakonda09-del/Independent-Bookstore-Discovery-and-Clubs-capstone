import mongoose from "mongoose";

/**
 * Independent Bookstore model.
 * Defines store identity, location, contact, pickup policies, and hold duration.
 */
const bookstoreSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    address: {
      street: { type: String, default: "" },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      zipCode: { type: String, default: "" },
    },
    contactPhone: {
      type: String,
      default: "",
    },
    contactEmail: {
      type: String,
      default: "",
    },
    storePolicy: {
      type: String,
      default: "Standard 48-hour pickup window. Valid ID matching reservation name required.",
    },
    pickupHours: {
      type: String,
      default: "Mon-Sat 10:00 AM - 7:00 PM, Sun 12:00 PM - 5:00 PM",
    },
    holdDurationHours: {
      type: Number,
      default: 48,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Bookstore = mongoose.model("Bookstore", bookstoreSchema);
