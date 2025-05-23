import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { login, scanBadge, getScannedAttendees } from "../controllers/staffController";
import { authenticateJWT } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await login(req, res);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.use(authenticateJWT);
router.post("/scan-badge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await scanBadge(req, res);
  } catch (error) {
    next(error);
  }
});
router.get("/scanned-attendees/:eventId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getScannedAttendees(req, res);
  } catch (error) {
    next(error);
  }
});

export default router; 