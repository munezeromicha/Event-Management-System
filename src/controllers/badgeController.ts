// controllers/badgeController.ts
import { Response } from "express";
import { generateBadge } from "../services/badgeService";
import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";
import { Event } from "../models/Event";
import { Badge } from "../models/Badge";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../middleware/auth";
import { verifyToken } from "../utils/jwt";

const registrationRepository = AppDataSource.getRepository(Registration);
const eventRepository = AppDataSource.getRepository(Event);
const badgeRepository = AppDataSource.getRepository(Badge);

// Helper function to get authentication from either header or query param
const getAuthUser = (req: AuthRequest) => {
  try {
    // First check if user is already set by middleware
    if (req.user) {
      return req.user;
    }
    
    // Then check for token in query parameters (for direct downloads)
    const queryToken = req.query.token as string;
    if (queryToken) {
      return verifyToken(queryToken);
    }
    
    return null;
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
};

export const generateAttendeeBadge = async (
  req: AuthRequest, 
  res: Response
): Promise<void> => {
  try {
    // Add CORS headers for local development
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // If it's a preflight request, respond successfully
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Check authentication using either header or query param
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { registrationId } = req.params;

    console.log(`Generating badge for registration ID: ${registrationId}`);

    // Get registration with event details
    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ['event']
    });

    if (!registration) {
      console.log(`Registration not found: ${registrationId}`);
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    console.log(`Registration status: ${registration.status}`);

    // Case-insensitive status check
    if (registration.status.toLowerCase() !== "approved") {
      res.status(400).json({ 
        message: "Registration is not approved",
        status: registration.status
      });
      return;
    }

    // Check if event exists
    if (!registration.event) {
      console.log(`Event not found for registration: ${registrationId}`);
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Check if badge already exists
    const existingBadge = await badgeRepository.findOne({
      where: { registrationId }
    });

    let badgeId;
    if (existingBadge) {
      console.log(`Badge already exists for registration: ${registrationId}`);
      badgeId = `badge_${registrationId}.pdf`;
    } else {
      // Generate badge
      console.log(`Generating new badge for registration: ${registrationId}`);
      badgeId = await generateBadge(registration, registration.event);
    }

    // Verify the badge file exists
    const badgePath = path.join(process.cwd(), 'public', 'badges', badgeId);
    if (!fs.existsSync(badgePath)) {
      console.log(`Badge file does not exist at: ${badgePath}`);
      res.status(500).json({ message: "Badge file could not be generated" });
      return;
    }

    // Determine if we should return the file or just the URL
    const returnFile = req.query.download === 'true';
    
    if (returnFile) {
      // Set content disposition headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="badge-${registrationId}.pdf"`);
      
      // Return the actual file
      const fileStream = fs.createReadStream(badgePath);
      fileStream.pipe(res);
      return;
    } else {
      // Return just the URL
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: `/badges/${badgeId}`,
        downloadUrl: `/api/badges/registrations/${registrationId}?download=true`
      });
      return;
    }
  } catch (error: any) {
    console.error("Badge generation error:", error);
    res.status(500).json({ message: "Failed to generate badge", error: error.message });
    return;
  }
};

export const getAttendeeBadgeByEventAndName = async (
  req: AuthRequest, 
  res: Response
): Promise<void> => {
  try {
    // Add CORS headers for local development
    res.header('Access-Control-Allow-Origin', 'http://localhost:3001');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // If it's a preflight request, respond successfully
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Check authentication using either header or query param
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    
    const { eventId, fullName } = req.params;
    
    // Find registration matching event and name
    const registration = await registrationRepository.findOne({
      where: { 
        event: { eventId },
        fullName,
        status: "approved" 
      },
      relations: ['event']
    });

    if (!registration) {
      res.status(404).json({ message: "Approved registration not found" });
      return;
    }

    // Check if event exists
    if (!registration.event) {
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Check if badge already exists
    const existingBadge = await badgeRepository.findOne({
      where: { registrationId: registration.registrationId }
    });

    let badgeId;
    if (existingBadge) {
      console.log(`Badge already exists for registration: ${registration.registrationId}`);
      badgeId = `badge_${registration.registrationId}.pdf`;
    } else {
      // Generate badge
      console.log(`Generating new badge for registration: ${registration.registrationId}`);
      badgeId = await generateBadge(registration, registration.event);
    }

    // Verify the badge file exists
    const badgePath = path.join(process.cwd(), 'public', 'badges', badgeId);
    if (!fs.existsSync(badgePath)) {
      console.log(`Badge file does not exist at: ${badgePath}`);
      res.status(500).json({ message: "Badge file could not be generated" });
      return;
    }

    // Determine if we should return the file or just the URL
    const returnFile = req.query.download === 'true';
    
    if (returnFile) {
      // Set content disposition headers for download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="badge-${registration.registrationId}.pdf"`);
      
      // Return the actual file
      const fileStream = fs.createReadStream(badgePath);
      fileStream.pipe(res);
      return;
    } else {
      // Return just the URL
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: `/badges/${badgeId}`,
        downloadUrl: `/api/badges/events/${eventId}/attendees/${encodeURIComponent(fullName)}?download=true`
      });
      return;
    }
  } catch (error: any) {
    console.error("Badge lookup error:", error);
    res.status(500).json({ message: "Failed to find badge", error: error.message });
    return;
  }
};