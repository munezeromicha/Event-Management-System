import { Router, Request, Response, NextFunction } from "express";
import { authenticateJWT, AuthRequest, isAdmin } from "../middleware/auth";
import { 
  scanAttendeeQR, 
  getAttendanceList, 
  getScannedAttendeesList,
  getScannedAttendeesByEventList,
  updateAttendeeBankAccount
} from "../controllers/attendanceController";

const router = Router();

// Apply authentication middleware to all routes
router.use((req: Request, res: Response, next: NextFunction) => {
  authenticateJWT(req as AuthRequest, res, next);
});

/**
 * @swagger
 * /api/attendance/scan:
 *   post:
 *     summary: Scan attendee QR code
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - qrCode
 *             properties:
 *               qrCode:
 *                 type: string
 *                 description: JSON string from QR code containing registrationId, eventId, and attendee name
 *     responses:
 *       200:
 *         description: Attendance recorded successfully
 *       400:
 *         description: Invalid QR code
 *       404:
 *         description: Registration not found
 *       408:
 *         description: Request timeout
 *       500:
 *         description: Server error
 */
router.post("/scan", (req: Request, res: Response, next: NextFunction) => {
  scanAttendeeQR(req, res).catch(next);
});

/**
 * @swagger
 * /api/attendance/events/{eventId}:
 *   get:
 *     summary: Get attendance list for an event
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the event
 *     responses:
 *       200:
 *         description: List of attendees
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/events/:eventId", (req: Request, res: Response, next: NextFunction) => {
  getAttendanceList(req as AuthRequest, res).catch(next);
});

/**
 * @swagger
 * /api/attendance/scanned:
 *   get:
 *     summary: Get all attendees whose badges have been scanned (across all events)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 500
 *         description: Number of records per page (maximum 500)
 *     responses:
 *       200:
 *         description: List of scanned attendees with pagination
 *       400:
 *         description: Invalid pagination parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/scanned", (req: Request, res: Response, next: NextFunction) => {
  getScannedAttendeesList(req as AuthRequest, res).catch(next);
});

/**
 * @swagger
 * /api/attendance/scanned/events/{eventId}:
 *   get:
 *     summary: Get attendees for a specific event whose badges have been scanned
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the event
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 500
 *         description: Number of records per page (maximum 500)
 *     responses:
 *       200:
 *         description: List of scanned attendees for the event with pagination
 *       400:
 *         description: Invalid event ID or pagination parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/scanned/events/:eventId", (req: Request, res: Response, next: NextFunction) => {
  getScannedAttendeesByEventList(req as AuthRequest, res).catch(next);
});

/**
 * @swagger
 * /api/attendance/{attendanceId}/bank-account:
 *   put:
 *     summary: Update bank account information for an attendee
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attendanceId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the attendance record
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankAccountNumber
 *               - bankName
 *             properties:
 *               bankAccountNumber:
 *                 type: string
 *                 description: Bank account number for payment processing
 *               bankName:
 *                 type: string
 *                 description: Name of the bank for payment processing
 *     responses:
 *       200:
 *         description: Bank account information updated successfully
 *       400:
 *         description: Invalid attendance ID or missing bank information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Attendee not found
 *       500:
 *         description: Server error
 */
router.put("/:attendanceId/bank-account", (req: Request, res: Response, next: NextFunction) => {
  updateAttendeeBankAccount(req as AuthRequest, res).catch(next);
});

export default router;