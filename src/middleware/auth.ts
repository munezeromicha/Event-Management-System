// middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    console.log('Auth middleware - Headers:', req.headers);
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('No authorization header found');
      res.status(401).json({ message: "No authorization header provided" });
      return;
    }

    // Check if header starts with "Bearer "
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid authorization header format');
      res.status(401).json({ message: "Invalid authorization header format" });
      return;
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      console.log('No token found in authorization header');
      res.status(401).json({ message: "No token provided" });
      return;
    }

    console.log('Attempting to verify token...');
    
    try {
      const user = verifyToken(token);
      console.log('Token verified successfully, user:', user);
      req.user = user;
      next();
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({ message: "Token expired" });
      } else if (error.name === 'JsonWebTokenError') {
        res.status(401).json({ message: "Invalid token" });
      } else {
        res.status(401).json({ message: "Token verification failed" });
      }
      return;
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: "Authentication error", error: error.message });
    return;
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
  }
};

export const isEventManager = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === "event_manager") {
    next();
  } else {
    res.status(403).json({ message: "Event manager access required" });
  }
};