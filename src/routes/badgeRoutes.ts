// routes/badgeRoutes.ts
import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { generateAttendeeBadge, getAttendeeBadgeByEventAndName } from "../controllers/badgeController";
import { authenticateJWT } from "../middleware/auth";
import { verifyToken } from "../utils/jwt";

const router = Router();

// Create a flexible auth middleware that checks both header and query token
const flexibleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check header for token
    const authHeader = req.headers.authorization;
    
    // Check query parameter for token
    const queryToken = req.query.token as string;
    
    let token = null;
    
    // Get token from header or query parameter
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' from string
    } else if (queryToken) {
      token = queryToken;
    }
    
    if (token) {
      try {
        // If token is present, verify it and attach to request
        const decoded = await verifyToken(token);
        (req as any).user = decoded;
      } catch (err) {
        console.log('Token verification failed:', err);
      }
    }
    
    // Always continue to next middleware
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    next();
  }
};

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
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: Authentication token (alternative to Bearer token)
 *     responses:
 *       200:
 *         description: Badge generated successfully
 *       400:
 *         description: Registration not approved
 *       404:
 *         description: Registration not found
 */
router.get(
  "/registrations/:registrationId", 
  flexibleAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const download = req.query.download === 'true';
      
      if (download) {
        // Set headers for direct download
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
      }
      
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
 *       - in: query
 *         name: token
 *         required: false
 *         schema:
 *           type: string
 *         description: Authentication token (alternative to Bearer token)
 *     responses:
 *       200:
 *         description: Badge found successfully
 *       404:
 *         description: Registration not found
 */
router.get(
  "/events/:eventId/attendees/:fullName", 
  flexibleAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await getAttendeeBadgeByEventAndName(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;