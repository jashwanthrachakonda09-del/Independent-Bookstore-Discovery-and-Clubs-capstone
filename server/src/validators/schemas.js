import { z } from "zod";

/**
 * Authentication and User Schemas
 */
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/**
 * Book & Inventory Schemas
 */
export const bookQuerySchema = z.object({
  q: z.string().optional(),
  genre: z.string().optional(),
  mood: z.string().optional(),
  theme: z.string().optional(),
  maxPages: z.coerce.number().optional(),
  storeId: z.string().optional(),
  inStockOnly: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
});

export const updateStockSchema = z.object({
  quantityOnHand: z.number().int().min(0, "Quantity on hand cannot be negative"),
  reason: z.string().min(3, "Reason for stock adjustment is required for auditing"),
  condition: z.enum(["new", "used_like_new", "used_good", "used_acceptable", "collector"]).default("new"),
  format: z.enum(["paperback", "hardcover", "audiobook", "ebook", "signed_edition"]).default("paperback"),
  price: z.number().min(0).optional(),
});

export const createReservationSchema = z.object({
  storeId: z.string().min(1, "Store ID is required"),
  condition: z.string().default("new"),
  format: z.string().default("paperback"),
  quantity: z.number().int().min(1).max(5).default(1),
  idempotencyKey: z.string().optional(),
});

/**
 * Reading Lists & Progress Schemas
 */
export const createReadingListSchema = z.object({
  name: z.string().min(1, "List name is required").max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

export const addToListSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  notes: z.string().max(1000).optional(),
});

export const updateProgressSchema = z.object({
  bookId: z.string().min(1, "Book ID is required"),
  status: z.enum(["want_to_read", "reading", "completed", "abandoned"]).optional(),
  currentPage: z.number().int().min(0).optional(),
  currentChapter: z.number().int().min(0).optional(),
  spoilerMode: z.enum(["spoiler_free", "progress_limited", "full_book"]).optional(),
  maximumPermittedChapter: z.number().int().min(0).optional(),
  maximumPermittedPage: z.number().int().min(0).optional(),
  visibility: z.enum(["private", "club"]).optional(),
  privateNotes: z.string().optional(),
});

/**
 * Reading Clubs Schemas
 */
export const createClubSchema = z.object({
  name: z.string().min(3, "Club name must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  genres: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  expectedGroupSize: z.number().int().min(2).default(8),
  readingLengthLimit: z.number().int().min(50).default(400),
  membershipPolicy: z.enum(["open", "approval_required"]).default("open"),
  spoilerPolicy: z.enum(["strict_no_spoilers", "chapter_synchronized", "unrestricted_post_meeting"]).default("chapter_synchronized"),
  timezone: z.string().default("America/New_York"),
});

export const createMeetingSchema = z.object({
  title: z.string().min(3, "Meeting title is required"),
  scheduledAt: z.string().datetime("Must be a valid ISO date string"),
  durationMinutes: z.number().int().min(15).max(300).default(60),
  bookId: z.string().optional(),
  readingTarget: z.string().default("Chapters 1 through 5"),
  targetChapter: z.number().int().min(1).optional(),
  agenda: z.string().optional(),
});

export const createDiscussionSchema = z.object({
  content: z.string().min(1, "Post content is required").max(3000),
  meetingId: z.string().optional(),
  parentId: z.string().optional(),
  hasSpoilers: z.boolean().default(false),
  spoilerChapter: z.number().int().min(0).default(0),
  spoilerSummary: z.string().optional(),
});

export const moderateDiscussionSchema = z.object({
  status: z.enum(["visible", "hidden", "flagged"]),
  moderationReason: z.string().min(3, "Moderation reason is required"),
});

/**
 * AI Chat & Agent Schemas
 */
export const bookChatSchema = z.object({
  query: z.string().min(1, "Query is required"),
  bookId: z.string().optional(),
  clubId: z.string().optional(),
  conversationId: z.string().optional(),
});

export const readingAgentSchema = z.object({
  clubId: z.string().min(1, "Club ID is required"),
  query: z.string().min(1, "Query is required"),
});

export const confirmBookSelectionSchema = z.object({
  clubId: z.string().min(1, "Club ID is required"),
  proposalId: z.string().min(1, "Proposal ID is required"),
  bookId: z.string().min(1, "Confirmed book ID is required"),
});

export const updateStaffRoleSchema = z.object({
  role: z.enum(["bookseller", "moderator", "admin"]),
  storeId: z.string().optional(),
  clubId: z.string().optional(),
  status: z.enum(["active", "pending", "revoked"]).default("active"),
  reason: z.string().min(3, "Reason is required for role changes"),
});
