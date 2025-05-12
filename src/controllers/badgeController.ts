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
    console.log('=== Badge Generation Process Started ===');
    console.log('Request URL:', req.url);
    console.log('Headers:', req.headers);
    console.log('Query params:', req.query);
    console.log('Registration ID:', req.params.registrationId);
    
    const user = getAuthUser(req);
    if (!user) {
      console.log('Authentication failed - no user found');
      res.status(401).json({ 
        message: "Authentication required",
        details: "Please provide a valid authentication token either in the Authorization header or as a query parameter"
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

    console.log('Registration found:', {
      id: registration.registrationId,
      status: registration.status,
      eventId: registration.event?.eventId
    });

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

    // Check if badge exists in database
    let badge = await badgeRepository.findOne({
      where: { registrationId }
    });
    
    let shouldGenerateNewBadge = false;
    
    // If badge doesn't exist or URL is missing, generate a new one
    if (!badge || !badge.badgeUrl) {
      console.log('No existing badge found, will generate new one');
      shouldGenerateNewBadge = true;
    } else {
      // Verify that the existing badge is still accessible
      try {
        console.log('Verifying existing badge accessibility...');
        await downloadFromCloudinary(badge.badgeUrl);
        console.log('Existing badge is accessible, using it');
      } catch (error) {
        console.log('Existing badge is not accessible, will generate new one:', error);
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
    
    if (returnFile) {
      try {
        if (!badge) {
          throw new Error('Badge not found in database');
        }
        console.log('Attempting to download badge with URL:', badge.badgeUrl);
        await handleBadgeDownload(
          badge,
          registration,
          registration.event,
          res,
          `badge-${registrationId}.pdf`
        );
        console.log('Badge download completed successfully');
      } catch (downloadError) {
        console.error('Error during badge download:', downloadError);
        res.status(500).json({ 
          message: "Failed to download badge", 
          error: downloadError instanceof Error ? downloadError.message : 'Unknown error',
          details: "There was an error downloading the badge file"
        });
      }
    } else {
      // Include token for direct download if available
      const tokenParam = req.query.token ? `&token=${req.query.token}` : '';
      const baseUrl = process.env.API_BASE_URL || `http://${req.get('host')}`;
      
      if (!badge) {
        throw new Error('Badge not found in database');
      }

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