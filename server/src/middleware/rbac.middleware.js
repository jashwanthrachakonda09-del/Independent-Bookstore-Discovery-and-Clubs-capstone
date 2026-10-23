import { StaffMembership } from "../models/staff-membership.model.js";
import { Club } from "../models/club.model.js";

/**
 * Verify reader has verified their email address before performing restricted actions
 * (such as reserving copies or joining clubs).
 */
export function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: "Email verification required. Please verify your email before proceeding.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }

  next();
}

/**
 * Require system administrator privilege.
 */
export async function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  if (req.user.isSystemAdmin) {
    return next();
  }

  // Check StaffMembership for admin role
  const adminMembership = await StaffMembership.findOne({
    userId: req.user._id,
    role: "admin",
    status: "active",
  });

  if (!adminMembership) {
    return res.status(403).json({
      success: false,
      message: "Administrator privilege required for this action.",
    });
  }

  next();
}

/**
 * Require authorized bookseller for a specific store.
 * Booksellers cannot modify another store's inventory without authorization.
 */
export function requireBookseller(getStoreIdFn) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }

      // System admins bypass store restrictions
      if (req.user.isSystemAdmin) {
        return next();
      }

      const targetStoreId =
        (getStoreIdFn && getStoreIdFn(req)) ||
        req.params.storeId ||
        req.body.storeId ||
        req.query.storeId;

      // Find active bookseller membership
      const query = {
        userId: req.user._id,
        role: "bookseller",
        status: "active",
      };

      if (targetStoreId) {
        query.storeId = targetStoreId;
      }

      const membership = await StaffMembership.findOne(query);

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Bookseller authorization required for this store.",
        });
      }

      req.booksellerStoreId = membership.storeId;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require club moderator for a specific club.
 * Moderators can only manage their assigned clubs.
 */
export function requireClubModerator(getClubIdFn) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }

      // System admins can manage any club
      if (req.user.isSystemAdmin) {
        return next();
      }

      const clubId =
        (getClubIdFn && getClubIdFn(req)) ||
        req.params.clubId ||
        req.params.id ||
        req.body.clubId;

      if (!clubId) {
        return res.status(400).json({ success: false, message: "Club ID is required." });
      }

      // Check if user is the creator of the club
      const club = await Club.findById(clubId);
      if (club && club.createdBy.toString() === req.user._id.toString()) {
        return next();
      }

      // Check StaffMembership for moderator assignment
      const membership = await StaffMembership.findOne({
        userId: req.user._id,
        role: "moderator",
        clubId,
        status: "active",
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "Club moderator authorization required for this club.",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
