import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import {
  registerForEvent,
  approveRegistration,
  rejectRegistration,
  getPendingRegistrations,
  getApprovedRegistrations,
  getAllAttendees,
  getAllRegistrations
} from "../controllers/registrationController";

const router = Router();

/**
 * @swagger
 * /api/registrations/{eventId}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Registrations]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Registration successful
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Event not found
 */

/**
 * @swagger
 * /api/registrations/{registrationId}/approve:
 *   patch:
 *     summary: Approve a registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registration approved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Registration not found
 */

/**
 * @swagger
 * /api/registrations/{registrationId}/reject:
 *   patch:
 *     summary: Reject a registration
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: registrationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Registration rejected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Registration not found
 */

/**
 * @swagger
 * /api/registrations/{eventId}/pending:
 *   get:
 *     summary: Get pending registrations for an event
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of pending registrations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/registrations/{eventId}/approved:
 *   get:
 *     summary: Get approved registrations for an event
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of approved registrations
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/registrations/attendees:
 *   get:
 *     summary: Get all registered attendees
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all registered attendees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   nationalId:
 *                     type: string
 *                   organization:
 *                     type: string
 *                   registrations:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         eventId:
 *                           type: string
 *                         eventName:
 *                           type: string
 *                         status:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/registrations:
 *   get:
 *     summary: Get all registrations with details
 *     tags: [Registrations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all registrations with details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   eventId:
 *                     type: string
 *                   eventTitle:
 *                     type: string
 *                   fullName:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phoneNumber:
 *                     type: string
 *                   nationalId:
 *                     type: string
 *                   organization:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending, approved, rejected]
 *                   registrationDate:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */

// Public routes
router.post("/:eventId/register", registerForEvent as unknown as any);

router.use(authenticateJWT as unknown as any);
router.get("/", getAllRegistrations as unknown as any);
router.patch("/:registrationId/approve", approveRegistration as unknown as any);
router.patch("/:registrationId/reject", rejectRegistration as unknown as any);
router.get("/:eventId/pending", getPendingRegistrations as unknown as any);
router.get("/:eventId/approved", getApprovedRegistrations as unknown as any);
router.get("/attendees", getAllAttendees as unknown as any);

export default router; 