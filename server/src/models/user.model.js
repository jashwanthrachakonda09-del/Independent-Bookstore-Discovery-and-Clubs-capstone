import mongoose from "mongoose";

/**
 * User schema supporting Readers, Booksellers, Moderators, and Admins.
 * Role-based privileges are determined through StaffMembership and User flags.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    verificationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "pending"],
      default: "active",
      index: true,
    },
    // Global platform admin flag (never selectable during ordinary reader registration)
    isSystemAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Never expose password hash or verification secrets in JSON output
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.verificationTokenExpiresAt;
  delete obj.passwordResetToken;
  delete obj.passwordResetTokenExpiresAt;
  return obj;
};

export const User = mongoose.model("User", userSchema);
