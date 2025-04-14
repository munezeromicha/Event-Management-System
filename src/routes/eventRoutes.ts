import { Router } from "express";
import { createEvent, getAllEvents, getEventById } from "../controllers/eventController";
import { authenticateJWT, isAdmin } from "../middleware/auth";

const router = Router();

router.post("/", authenticateJWT as any, isAdmin as any, createEvent as any);
router.get("/", getAllEvents as any);
router.get("/:id", getEventById as any);

export default router;
