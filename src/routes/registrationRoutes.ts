import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import {
  registerForEvent,
  approveRegistration,
  rejectRegistration,
  getPendingRegistrations,
  getApprovedRegistrations
} from "../controllers/registrationController";

const router = Router();

// Public routes
router.post("/:eventId/register", registerForEvent as unknown as any);

// Protected routes (admin only)
router.use(authenticateJWT as unknown as any);
router.patch("/:registrationId/approve", approveRegistration as unknown as any);
router.patch("/:registrationId/reject", rejectRegistration as unknown as any);
router.get("/:eventId/pending", getPendingRegistrations as unknown as any);
router.get("/:eventId/approved", getApprovedRegistrations as unknown as any);

export default router; 