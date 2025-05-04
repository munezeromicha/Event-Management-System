import { Router } from "express";
import { createEvent, getAllEvents, getEventById, deleteEvent, updateEvent } from "../controllers/eventController";
import { authenticateJWT, isAdmin } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - eventType
 *               - location
 *               - description
 *               - maxCapacity
 *               - financialSupportOption
 *               - date
 *               - time
 *             properties:
 *               name:
 *                 type: string
 *               eventType:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               maxCapacity:
 *                 type: number
 *               financialSupportOption:
 *                 type: boolean
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Event date in YYYY-MM-DD format
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Event time in HH:MM format
 *     responses:
 *       201:
 *         description: Event created successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 * 
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       404:
 *         description: Event not found
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               eventType:
 *                 type: string
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               maxCapacity:
 *                 type: number
 *               financialSupportOption:
 *                 type: boolean
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Event date in YYYY-MM-DD format
 *               time:
 *                 type: string
 *                 format: time
 *                 description: Event time in HH:MM format
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Event not found
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Event deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Event not found
 */

router.post("/", authenticateJWT as any, isAdmin as any, createEvent as any);
router.get("/", getAllEvents as any);
router.get("/:id", getEventById as any);
router.put("/:id", authenticateJWT as any, isAdmin as any, updateEvent as any);
router.delete("/:id", authenticateJWT as any, isAdmin as any, deleteEvent as any);

export default router;
