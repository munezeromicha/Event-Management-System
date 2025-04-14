import { Router } from "express";
import { generateAttendeeBadge } from "../controllers/badgeController";

const router = Router();

// Generate badge for an approved registration
router.get("/registrations/:registrationId", generateAttendeeBadge as unknown as any);

export default router; 