import express from "express";
import { Club } from "../models/club.model.js";
import { ClubMembership } from "../models/club-membership.model.js";
import { Meeting } from "../models/meeting.model.js";
import { Discussion } from "../models/discussion.model.js";
import { ReadingProgress } from "../models/reading-progress.model.js";
import { runReadingClubAgent, confirmClubBookSelection } from "../services/reading-agent.service.js";
import {
  createClubSchema,
  createMeetingSchema,
  createDiscussionSchema,
  moderateDiscussionSchema,
  readingAgentSchema,
  confirmBookSelectionSchema,
} from "../validators/schemas.js";
import { requireAuth, optionalAuth } from "../middleware/auth.middleware.js";
import { requireEmailVerified, requireClubModerator } from "../middleware/rbac.middleware.js";
import { recordAuditEvent } from "../services/audit.service.js";

export const clubRouter = express.Router();

/**
 * Browse published clubs.
 * URL: GET /api/clubs
 */
clubRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const clubs = await Club.find({ visibility: "public" })
      .populate("currentBookId", "title authors coverImage readingLength")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Populate member counts and upcoming meetings
    const enrichedClubs = await Promise.all(
      clubs.map(async (club) => {
        const memberCount = await ClubMembership.countDocuments({
          clubId: club._id,
          status: "active",
        });

        const nextMeeting = await Meeting.findOne({
          clubId: club._id,
          status: "upcoming",
          scheduledAt: { $gte: new Date() },
        })
          .sort({ scheduledAt: 1 })
          .lean();

        let isMember = false;
        let isModerator = false;
        if (req.user) {
          const membership = await ClubMembership.findOne({
            clubId: club._id,
            userId: req.user._id,
            status: "active",
          });
          if (membership) {
            isMember = true;
            isModerator = membership.role === "moderator";
          }
          if (club.createdBy?._id?.toString() === req.user._id.toString()) {
            isModerator = true;
          }
        }

        return {
          ...club,
          memberCount,
          nextMeeting,
          userMembership: { isMember, isModerator },
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { clubs: enrichedClubs },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new reading club.
 * URL: POST /api/clubs
 */
clubRouter.post("/", requireAuth, requireEmailVerified, async (req, res, next) => {
  try {
    const validatedData = createClubSchema.parse(req.body);
    const slug = validatedData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const club = await Club.create({
      ...validatedData,
      slug,
      createdBy: req.user._id,
    });

    // Automatically make creator an active moderator
    await ClubMembership.create({
      clubId: club._id,
      userId: req.user._id,
      role: "moderator",
      status: "active",
    });

    res.status(201).json({
      success: true,
      message: "Reading club created.",
      data: { club },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve club detail with meetings and current reading selection.
 * URL: GET /api/clubs/:id
 */
clubRouter.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id)
      .populate("currentBookId", "title authors coverImage readingLength genres description")
      .populate("createdBy", "name")
      .lean();

    if (!club) {
      return res.status(404).json({ success: false, message: "Club not found." });
    }

    const memberCount = await ClubMembership.countDocuments({
      clubId: club._id,
      status: "active",
    });

    const meetings = await Meeting.find({ clubId: club._id })
      .populate("bookId", "title authors coverImage")
      .sort({ scheduledAt: 1 })
      .lean();

    let userMembership = null;
    if (req.user) {
      userMembership = await ClubMembership.findOne({
        clubId: club._id,
        userId: req.user._id,
        status: "active",
      }).lean();
    }

    res.status(200).json({
      success: true,
      data: {
        club,
        memberCount,
        meetings,
        userMembership,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Join a reading club. Requires verified email.
 * URL: POST /api/clubs/:id/join
 */
clubRouter.post("/:id/join", requireAuth, requireEmailVerified, async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);
    if (!club) {
      return res.status(404).json({ success: false, message: "Club not found." });
    }

    const existingMembership = await ClubMembership.findOne({
      clubId: club._id,
      userId: req.user._id,
    });

    if (existingMembership && existingMembership.status === "active") {
      return res.status(400).json({ success: false, message: "You are already a member of this club." });
    }

    const status = club.membershipPolicy === "approval_required" ? "pending" : "active";

    const membership = await ClubMembership.findOneAndUpdate(
      { clubId: club._id, userId: req.user._id },
      {
        role: "member",
        status,
        joinedAt: new Date(),
        leftAt: null,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: status === "active" ? `Welcome to ${club.name}!` : "Membership request submitted for moderator review.",
      data: { membership },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Leave a reading club.
 * URL: POST /api/clubs/:id/leave
 */
clubRouter.post("/:id/leave", requireAuth, async (req, res, next) => {
  try {
    const membership = await ClubMembership.findOne({
      clubId: req.params.id,
      userId: req.user._id,
      status: "active",
    });

    if (!membership) {
      return res.status(400).json({ success: false, message: "Active membership not found." });
    }

    membership.status = "left";
    membership.leftAt = new Date();
    await membership.save();

    res.status(200).json({
      success: true,
      message: "You have left the reading club.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve club meetings.
 * URL: GET /api/clubs/:id/meetings
 */
clubRouter.get("/:id/meetings", optionalAuth, async (req, res, next) => {
  try {
    const meetings = await Meeting.find({ clubId: req.params.id })
      .populate("bookId", "title authors coverImage readingLength")
      .sort({ scheduledAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { meetings },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new meeting for an assigned club. Restricted to authorized club moderator.
 * URL: POST /api/clubs/:id/meetings
 */
clubRouter.post("/:id/meetings", requireAuth, requireClubModerator(), async (req, res, next) => {
  try {
    const validatedData = createMeetingSchema.parse(req.body);

    const meeting = await Meeting.create({
      ...validatedData,
      clubId: req.params.id,
      scheduledAt: new Date(validatedData.scheduledAt),
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Club meeting scheduled.",
      data: { meeting },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Retrieve club discussions with reader-specific spoiler masking.
 * URL: GET /api/clubs/:id/discussions
 */
clubRouter.get("/:id/discussions", requireAuth, async (req, res, next) => {
  try {
    // Check if user is active member
    const membership = await ClubMembership.findOne({
      clubId: req.params.id,
      userId: req.user._id,
      status: "active",
    });

    if (!membership && !req.user.isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: "Club membership is required to view discussion posts.",
      });
    }

    const club = await Club.findById(req.params.id).lean();
    let readerMaxChapter = 999;

    // Check reader's progress boundary on club's current book
    if (club?.currentBookId) {
      const progress = await ReadingProgress.findOne({
        readerId: req.user._id,
        bookId: club.currentBookId,
      });
      if (progress && progress.spoilerMode === "progress_limited") {
        readerMaxChapter = progress.maximumPermittedChapter || 1;
      }
    }

    const posts = await Discussion.find({
      clubId: req.params.id,
      status: { $ne: "hidden" },
    })
      .populate("authorId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Mark posts that exceed reader's spoiler boundary so the UI can mask them
    const safePosts = posts.map((post) => {
      const exceedsBoundary = post.hasSpoilers && post.spoilerChapter > readerMaxChapter;
      return {
        ...post,
        isSpoilerForViewer: exceedsBoundary,
        maskedContent: exceedsBoundary ? "Content hidden: contains spoilers beyond your current reading chapter." : null,
      };
    });

    res.status(200).json({
      success: true,
      data: { discussions: safePosts },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new discussion post or reply.
 * URL: POST /api/clubs/:id/discussions
 */
clubRouter.post("/:id/discussions", requireAuth, async (req, res, next) => {
  try {
    // Check active membership
    const membership = await ClubMembership.findOne({
      clubId: req.params.id,
      userId: req.user._id,
      status: "active",
    });

    if (!membership && !req.user.isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: "You must be an active club member to post in discussions.",
      });
    }

    const validatedData = createDiscussionSchema.parse(req.body);

    const post = await Discussion.create({
      ...validatedData,
      clubId: req.params.id,
      authorId: req.user._id,
    });

    const populatedPost = await Discussion.findById(post._id).populate("authorId", "name");

    res.status(201).json({
      success: true,
      message: "Discussion post created.",
      data: { discussion: populatedPost },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Moderate a discussion post. Restricted to authorized club moderator.
 * URL: PATCH /api/discussions/:id/moderation
 */
clubRouter.patch(
  "/discussions/:id/moderation",
  requireAuth,
  async (req, res, next) => {
    try {
      const post = await Discussion.findById(req.params.id);
      if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
      }

      // Check moderator authorization for this specific club
      const isMod =
        req.user.isSystemAdmin ||
        (await ClubMembership.findOne({
          clubId: post.clubId,
          userId: req.user._id,
          role: "moderator",
          status: "active",
        }));

      if (!isMod) {
        return res.status(403).json({
          success: false,
          message: "Club moderator authorization required to moderate discussion posts.",
        });
      }

      const { status, moderationReason } = moderateDiscussionSchema.parse(req.body);

      post.status = status;
      post.moderationReason = moderationReason;
      post.moderatedBy = req.user._id;
      post.moderatedAt = new Date();
      await post.save();

      // Audit log moderation action
      await recordAuditEvent({
        actingUserId: req.user._id,
        action: "MODERATION_ACTION",
        entity: "Discussion",
        entityId: post._id,
        details: { status, moderationReason, clubId: post.clubId },
      });

      res.status(200).json({
        success: true,
        message: `Post marked as ${status}.`,
        data: { discussion: post },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * AI-Assisted Club Book Selection workflow.
 * Executes bounded agent: searchCatalog -> checkStockAndLength -> compareClubConstraints -> proposal.
 * Does NOT modify stock or publish selection automatically.
 * URL: POST /api/clubs/:id/book-selection
 */
clubRouter.post(
  "/:id/book-selection",
  requireAuth,
  requireClubModerator(),
  async (req, res, next) => {
    try {
      const validatedData = readingAgentSchema.parse({
        clubId: req.params.id,
        query: req.body.query,
      });

      const result = await runReadingClubAgent({
        clubId: validatedData.clubId,
        query: validatedData.query,
        user: req.user,
      });

      res.status(200).json({
        success: true,
        message: "AI book-selection proposal generated. Please review and confirm your choice.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Publish club book selection after explicit human moderator confirmation.
 * URL: POST /api/clubs/:id/book-selection/confirm
 */
clubRouter.post(
  "/:id/book-selection/confirm",
  requireAuth,
  requireClubModerator(),
  async (req, res, next) => {
    try {
      const validatedData = confirmBookSelectionSchema.parse({
        clubId: req.params.id,
        proposalId: req.body.proposalId,
        bookId: req.body.bookId,
      });

      const result = await confirmClubBookSelection({
        clubId: validatedData.clubId,
        proposalId: validatedData.proposalId,
        bookId: validatedData.bookId,
        userId: req.user._id,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);
