// routes/badgeRoutes.ts
import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { generateAttendeeBadge, getAttendeeBadgeByEventAndName } from "../controllers/badgeController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Define type for AuthRequest if it's a custom type used by authenticateJWT
interface AuthRequest extends Request {
  user?: any; // Define this according to your actual user structure
}

/**
 * @swagger
 * /api/badges/registrations/{registrationId}:
 *   get:
 *     summary: Generate attendee badge
 *     tags: [Badges]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: download
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Set to true to download the badge directly
 *     responses:
 *       200:
 *         description: Badge generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 badgeUrl:
 *                   type: string
 *                 downloadUrl:
 *                   type: string
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Registration not approved
 *       404:
 *         description: Registration not found
 */
router.get(
  "/registrations/:registrationId", 
  authenticateJWT,
  // Wrap the handler function to ensure expected return type
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await generateAttendeeBadge(req, res);
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
 *       - in: path
 *         name: fullName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: download
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Set to true to download the badge directly
 *     responses:
 *       200:
 *         description: Badge generated successfully
 *       404:
 *         description: Approved registration not found
 */
router.get(
  "/events/:eventId/attendees/:fullName", 
  authenticateJWT,
  // Wrap the handler function to ensure expected return type
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await getAttendeeBadgeByEventAndName(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;