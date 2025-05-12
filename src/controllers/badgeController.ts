// controllers/badgeController.ts
import { Response } from "express";
import { generateBadge } from "../services/simpleBadgeService";
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
    // Log for debugging
    console.log('Auth debug:', {
      headers: req.headers.authorization ? 'Bearer token present' : 'No Auth header',
      queryToken: req.query.token ? 'Token present' : 'No query token',
      user: req.user ? 'User present in request' : 'No user in request'
    });
    
    // First check if user is already set by middleware
    if (req.user) {
      return req.user;
    }
    
    // Check header for token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7); // Remove 'Bearer '
        return verifyToken(token);
      } catch (err) {
        console.error('Error verifying header token:', err);
      }
    }
    
    // Fallback to query token if present
    const queryToken = req.query.token as string;
    if (queryToken) {
      try {
        return verifyToken(queryToken);
      } catch (err) {
        console.error('Error verifying query token:', err);
      }
    }
    
    // No authentication found
    console.log('No valid authentication found in request');
    return null;
  } catch (error: unknown) {
    console.error("Auth error:", error);
    return null;
  }
};

// Simple helper function to serve PDF file
const servePdfFile = (filePath: string, res: Response, filename: string): void => {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ 
      message: "Badge file not found",
      details: "The badge file could not be found on the server"
    });
    return;
  }
  
  const fileStream = fs.createReadStream(filePath);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  
  fileStream.pipe(res);
  
  fileStream.on('error', (err) => {
    console.error('Error serving PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: "Error serving badge file",
        details: err.message
      });
    }
  });
};

const handleBadgeDownload = async (
  badge: Badge,
  registration: Registration,
  event: Event,
  res: Response,
  filename: string
): Promise<void> => {
  try {
    const filePath = path.join(process.cwd(), 'public', badge.badgeUrl.substring(1));
    
    if (!fs.existsSync(filePath)) {
      // If file doesn't exist, try to regenerate it
      const newBadgeUrl = await generateBadge(registration, event);
      badge.badgeUrl = newBadgeUrl;
    }

    const fileStream = fs.createReadStream(filePath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    fileStream.pipe(res);
    
    fileStream.on('error', (err) => {
      console.error('Error serving PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error serving badge file" });
      }
    });
  } catch (error) {
    console.error('Error downloading badge:', error);
    res.status(500).json({ message: "Failed to download badge" });
  }
};

export const generateAttendeeBadge = async (
  req: AuthRequest, 
  res: Response
): Promise<void> => {
  try {
    console.log('=== Badge Generation Process Started ===');
    console.log('Request params:', req.params);
    console.log('Request query:', req.query);
    
    const user = getAuthUser(req);
    if (!user) {
      console.log('Authentication failed - no user found');
      res.status(401).json({ 
        message: "Authentication required",
        details: "Please provide a valid authentication token"
      });
      return;
    }

    const { registrationId } = req.params;
    console.log(`Processing badge for registration ID: ${registrationId}`);

    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ['event']
    });

    if (!registration) {
      console.log(`Registration not found: ${registrationId}`);
      res.status(404).json({ 
        message: "Registration not found",
        details: `No registration found with ID: ${registrationId}`
      });
      return;
    }

    if (registration.status.toLowerCase() !== "approved") {
      console.log(`Registration not approved: ${registrationId} (Status: ${registration.status})`);
      res.status(400).json({ 
        message: "Registration is not approved",
        status: registration.status,
        details: "Only approved registrations can download badges"
      });
      return;
    }

    if (!registration.event) {
      console.log(`Event not found for registration: ${registrationId}`);
      res.status(404).json({ 
        message: "Event not found for this registration",
        details: "The registration exists but has no associated event"
      });
      return;
    }

    // Check if badge exists
    let badge = await badgeRepository.findOne({
      where: { registrationId }
    });
    
    let shouldGenerateNewBadge = false;
    
    // If badge doesn't exist or URL is missing, generate a new one
    if (!badge || !badge.badgeUrl) {
      console.log('No existing badge found, will generate new one');
      shouldGenerateNewBadge = true;
    } else {
      // Verify that the existing badge file exists
      const filePath = path.join(process.cwd(), 'public', badge.badgeUrl.substring(1));
      if (!fs.existsSync(filePath)) {
        console.log('Existing badge file not found, will generate new one');
        shouldGenerateNewBadge = true;
      }
    }

    // Generate a new badge if needed
    if (shouldGenerateNewBadge) {
      console.log(`Generating new badge for registration: ${registrationId}`);
      try {
        const badgeUrl = await generateBadge(registration, registration.event);
        
        badge = await badgeRepository.findOne({
          where: { registrationId }
        });
        
        if (!badge || !badge.badgeUrl) {
          throw new Error('Badge generation failed - no URL returned');
        }
        
        console.log('New badge generated with URL:', badge.badgeUrl);
      } catch (error) {
        console.error("Error generating badge:", error);
        res.status(500).json({ 
          message: "Failed to generate badge",
          details: error instanceof Error ? error.message : 'Unknown error during badge generation'
        });
        return;
      }
    }

    const returnFile = req.query.download === 'true';
    console.log('Download requested:', returnFile);
    
    if (returnFile && badge) {
      // Serve the PDF file directly
      const filePath = path.join(process.cwd(), 'public', badge.badgeUrl.substring(1));
      console.log('Serving file from path:', filePath);
      servePdfFile(filePath, res, `badge-${registrationId}.pdf`);
    } else if (badge) {
      // Return URL information
      const tokenParam = req.query.token ? `&token=${req.query.token}` : '';
      const baseUrl = process.env.API_BASE_URL || `http://${req.get('host')}`;
      
      const downloadUrl = `${baseUrl}/api/badges/registrations/${registrationId}?download=true${tokenParam}`;
      
      console.log('Returning badge URLs:', {
        badgeUrl: badge.badgeUrl,
        downloadUrl
      });
      
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl
      });
    } else {
      res.status(500).json({
        message: "Failed to generate badge",
        details: "Badge generation completed but no badge was found"
      });
    }
  } catch (error: any) {
    console.error("Badge generation error:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      message: "Failed to generate badge", 
      error: error.message,
      details: "An unexpected error occurred while processing the badge"
    });
  }
};

export const getAttendeeBadgeByEventAndName = async (
  req: AuthRequest, 
  res: Response
): Promise<void> => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { eventId, fullName } = req.params;
    const decodedFullName = decodeURIComponent(fullName);

    // Find the registration by event and full name
    const registration = await registrationRepository
      .createQueryBuilder('registration')
      .leftJoinAndSelect('registration.event', 'event')
      .where('registration.event.eventId = :eventId', { eventId })
      .andWhere('registration.fullName = :fullName', { fullName: decodedFullName })
      .getOne();

    if (!registration) {
      res.status(404).json({ message: "Registration not found" });
      return;
    }

    if (registration.status.toLowerCase() !== "approved") {
      res.status(400).json({ 
        message: "Registration is not approved",
        status: registration.status
      });
      return;
    }

    if (!registration.event) {
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Check if badge already exists in database
    let badge = await badgeRepository.findOne({
      where: { registrationId: registration.registrationId }
    });

    // Generate badge if it doesn't exist
    if (!badge || !badge.badgeUrl) {
      try {
        const badgeUrl = await generateBadge(registration, registration.event);
        badge = await badgeRepository.findOne({
          where: { registrationId: registration.registrationId }
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to generate badge" });
        return;
      }
    }

    if (!badge || !badge.badgeUrl) {
      res.status(500).json({ message: "Badge URL not found" });
      return;
    }

    const returnFile = req.query.download === 'true';
    
    if (returnFile) {
      await handleBadgeDownload(
        badge,
        registration,
        registration.event,
        res,
        `badge-${decodedFullName.replace(/\s+/g, '_')}.pdf`
      );
    } else {
      // Return URL info
      res.status(200).json({
        message: "Badge found successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl: `/api/badges/events/${eventId}/attendees/${encodeURIComponent(fullName)}?download=true&token=${req.query.token || ''}`
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      message: "Failed to retrieve badge", 
      error: error.message 
    });
  }
};