// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const user = verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      res.status(403).json({ message: "Invalid token" });
      // Don't return anything, just end the response
    }
  } else {
    res.status(401).json({ message: "Authentication required" });
    // Don't return anything, just end the response
  }
};

export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && (req.user.role === "admin" || req.user.role === "staff")) {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
    // Don't return anything, just end the response
  }
};

export const isEventManager = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === "event_manager") {
    next();
  } else {
    res.status(403).json({ message: "Event manager access required" });
    // Don't return anything, just end the response
  }
};