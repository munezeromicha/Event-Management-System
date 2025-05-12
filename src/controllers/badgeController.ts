// controllers/badgeController.ts
import { Response } from "express";
import { generateBadge } from "../services/badgeService";
import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";
import { Event } from "../models/Event";
import { Badge } from "../models/Badge";
import { AuthRequest } from "../middleware/auth";
import { verifyToken } from "../utils/jwt";
import axios from 'axios';
import cloudinary from '../config/cloudinary';

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
    
    // Fallback to query token if present
    const queryToken = req.query.token as string;
    if (queryToken) {
      return verifyToken(queryToken);
    }
    
    // No authentication found
    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error('Authentication failed: ' + error.message);
    } else {
      throw new Error('Authentication failed: Unknown error');
    }
  }
};

// Improved function to get a fresh signed URL for a badge
const getSignedBadgeUrl = (publicId: string): string => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    format: 'pdf',
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  });
};

// Improved download function for Cloudinary
const downloadFromCloudinary = async (url: string): Promise<Buffer> => {
  try {
    // Extract the public_id from the URL if it's a Cloudinary URL
    let publicId = '';
    
    if (url.includes('cloudinary.com')) {
      // Extract the public ID from the URL
      const urlParts = url.split('/upload/');
      if (urlParts.length > 1) {
        publicId = urlParts[1].split('.')[0];
      }
    }
    
    // If we've extracted a public ID, get a fresh signed URL
    if (publicId) {
      url = getSignedBadgeUrl(publicId);
    }
    
    // Direct download approach using axios
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'Event-Management-System'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Empty file received from Cloudinary');
    }

    return Buffer.from(response.data);
  } catch (error: any) {
    // Check if this is a 404 error (file not found)
    if (error.response && error.response.status === 404) {
      throw new Error('BADGE_NOT_FOUND');
    }
    
    throw error;
  }
};

// Helper function to handle the badge download process
const handleBadgeDownload = async (
  badge: Badge,
  registration: Registration,
  event: Event,
  res: Response,
  filename: string
): Promise<void> => {
  try {
    let pdfBuffer: Buffer;
    
    try {
      // First try to download directly
      pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
    } catch (downloadError: any) {
      // If badge not found or other error, try to regenerate it
      if (downloadError.message === 'BADGE_NOT_FOUND') {
        const newBadgeUrl = await generateBadge(registration, event);
        
        // Get the updated badge record
        const updatedBadge = await badgeRepository.findOne({
          where: { registrationId: registration.registrationId }
        });
        
        if (!updatedBadge || !updatedBadge.badgeUrl) {
          throw new Error('Failed to regenerate badge');
        }
        
        badge.badgeUrl = updatedBadge.badgeUrl;
        
        // Try downloading the regenerated badge
        pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
      } else {
        // If it's another error, re-throw it
        throw downloadError;
      }
    }
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send the file
    res.send(pdfBuffer);
  } catch (error: any) {
    res.status(500).json({ 
      message: "Failed to download badge", 
      error: error.message 
    });
  }
};

export const generateAttendeeBadge = async (
  req: AuthRequest, 
  res: Response
): Promise<void> => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { registrationId } = req.params;

    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ['event']
    });

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

    // Check if badge already exists
    let badge = await badgeRepository.findOne({
      where: { registrationId }
    });
    
    // Generate new badge if needed
    if (!badge || !badge.badgeUrl) {
      try {
        const badgeUrl = await generateBadge(registration, registration.event);
        
        badge = await badgeRepository.findOne({
          where: { registrationId }
        });
        
        if (!badge || !badge.badgeUrl) {
          throw new Error('Badge generation failed - no URL returned');
        }
      } catch (error) {
        res.status(500).json({ 
          message: "Failed to generate badge",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
      }
    }

    const returnFile = req.query.download === 'true';
    
    if (returnFile) {
      await handleBadgeDownload(
        badge,
        registration,
        registration.event,
        res,
        `badge-${registrationId}.pdf`
      );
    } else {
      // Return URL info
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl: `/api/badges/registrations/${registrationId}?download=true&token=${req.query.token || ''}`
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      message: "Failed to generate badge", 
      error: error.message 
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