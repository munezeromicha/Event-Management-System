import { Router } from "express";
import { authenticateJWT } from "../middleware/auth";
import { scanAttendeeQR, getAttendanceList } from "../controllers/attendanceController";

const router = Router();

// Public route for scanning QR codes
router.post("/scan", scanAttendeeQR as unknown as any);

// Protected routes (admin only)
router.use(authenticateJWT as unknown as any);
router.get("/events/:eventId", getAttendanceList as unknown as any);

export default router; 