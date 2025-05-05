// routes/badgeRoutes.ts
import { Router, Request, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest } from "../middleware/auth";
import { generateAttendeeBadge, getAttendeeBadgeByEventAndName } from "../controllers/badgeController";

const router = Router();

// Apply authentication middleware to all routes that need it
const auth = (req: Request, res: Response, next: NextFunction) => {
  authenticateJWT(req as AuthRequest, res, next);
};

/**
 * @swagger
 * /api/badges/generate/{registrationId}:
 *   get:
 *     summary: Generate badge for an attendee
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the registration
 *     responses:
 *       200:
 *         description: Badge generated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Registration not found
 */
router.get(
  "/generate/:registrationId",
  auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await generateAttendeeBadge(req as AuthRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/badges/events/{eventId}/attendees/{fullName}:
 *   get:
 *     summary: Get attendee badge by event and name
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the event
 *       - in: path
 *         name: fullName
 *         required: true
 *         schema:
 *           type: string
 *         description: Full name of the attendee
 *     responses:
 *       200:
 *         description: Badge retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Badge not found
 */
router.get(
  "/events/:eventId/attendees/:fullName",
  auth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAttendeeBadgeByEventAndName(req as AuthRequest, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;