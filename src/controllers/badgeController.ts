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
      console.log('User found in request:', req.user);
      return req.user;
    }
    
    // Fallback to query token if present
    const queryToken = req.query.token as string;
    if (queryToken) {
      console.log('Verifying query token');
      return verifyToken(queryToken);
    }
    
    // No authentication found
    console.log('No authentication found in request');
    return null;
  } catch (error: unknown) {
    console.error("Auth error:", error);
    if (error instanceof Error) {
      throw new Error('Authentication failed: ' + error.message);
    } else {
      throw new Error('Authentication failed: Unknown error');
    }
  }
};

// Helper function to get a fresh signed URL for a badge
const getSignedBadgeUrl = (publicId: string): string => {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    format: 'pdf',
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  });
};

// Simplified direct download function - No auth needed for Cloudinary
const downloadFromCloudinary = async (url: string): Promise<Buffer> => {
  try {
    console.log('=== Cloudinary Download Debug ===');
    console.log('Attempting to download from Cloudinary URL:', url);
    
    // Check if URL is valid
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided');
    }
    
    // Ensure URL starts with https://res.cloudinary.com
    if (!url.startsWith('https://res.cloudinary.com')) {
      console.warn('URL does not start with https://res.cloudinary.com:', url);
    }
    
    // Direct download approach using axios - simpler and more reliable
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
        'User-Agent': 'Event-Management-System'
      },
      timeout: 30000, // 30 second timeout
      validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
      }
    });

    console.log('Cloudinary response status:', response.status);
    console.log('Cloudinary response headers:', response.headers);

    if (response.status === 401) {
      // If unauthorized, try to get a fresh signed URL
      const publicId = url.split('/').slice(-1)[0].split('.')[0]; // Extract public_id from URL
      const freshSignedUrl = getSignedBadgeUrl(`badges/${publicId}`);
      console.log('Retrying with fresh signed URL:', freshSignedUrl);
      return downloadFromCloudinary(freshSignedUrl);
    }

    if (response.status === 404) {
      console.log('Badge not found in Cloudinary, attempting to regenerate...');
      throw new Error('BADGE_NOT_FOUND');
    }

    if (!response.data || response.data.length === 0) {
      console.error('Empty response from Cloudinary download');
      throw new Error('Empty file received from Cloudinary');
    }

    console.log('Successfully downloaded file from Cloudinary, size:', response.data.length);
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Error downloading from Cloudinary:', error.message);
    console.error('Full error:', error);
    
    // Log the URL that failed
    console.error('Failed URL:', url);
    
    // Check if this is a 404 error (file not found)
    if (error.response && error.response.status === 404) {
      console.log('Badge not found in Cloudinary, attempting to regenerate...');
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
    console.log('=== Badge Download Process ===');
    console.log('Badge URL:', badge.badgeUrl);
    console.log('Registration ID:', registration.registrationId);
    
    // Download the file from Cloudinary
    let pdfBuffer: Buffer;
    
    try {
      // First try to download directly
      pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
    } catch (downloadError: any) {
      console.error('Download error:', downloadError.message);
      
      // If badge not found or other error, try to regenerate it
      if (downloadError.message === 'BADGE_NOT_FOUND') {
        console.log('Badge not found in Cloudinary, regenerating...');
        const newBadgeUrl = await generateBadge(registration, event);
        
        // Get the updated badge record
        const updatedBadge = await badgeRepository.findOne({
          where: { registrationId: registration.registrationId }
        });
        
        if (!updatedBadge || !updatedBadge.badgeUrl) {
          throw new Error('Failed to regenerate badge');
        }
        
        console.log('New badge URL after regeneration:', updatedBadge.badgeUrl);
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
    console.error("Error downloading badge:", error);
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
    console.log('Headers:', req.headers);
    console.log('User from middleware:', req.user);
    
    const user = getAuthUser(req);
    if (!user) {
      console.log('Authentication failed - no user found');
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const { registrationId } = req.params;
    console.log(`Generating badge for registration ID: ${registrationId}`);

    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ['event']
    });

    if (!registration) {
      console.log(`Registration not found: ${registrationId}`);
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
      console.log(`Event not found for registration: ${registrationId}`);
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Always regenerate the badge to ensure it's fresh
    console.log(`Generating new badge for registration: ${registrationId}`);
    try {
      const badgeUrl = await generateBadge(registration, registration.event);
      console.log('Badge generated with URL:', badgeUrl);
      
      const badge = await badgeRepository.findOne({
        where: { registrationId }
      });
      
      if (!badge || !badge.badgeUrl) {
        throw new Error('Badge generation failed - no URL returned');
      }

      const returnFile = req.query.download === 'true';
      console.log('Download requested:', returnFile);
      
      if (returnFile) {
        try {
          const pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="badge-${registrationId}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          
          res.send(pdfBuffer);
        } catch (downloadError) {
          console.error('Error downloading badge:', downloadError);
          res.status(500).json({ 
            message: "Failed to download badge", 
            error: downloadError instanceof Error ? downloadError.message : 'Unknown error' 
          });
        }
      } else {
        res.status(200).json({
          message: "Badge generated successfully",
          badgeUrl: badge.badgeUrl,
          downloadUrl: `/api/badges/registrations/${registrationId}?download=true`
        });
      }
    } catch (error) {
      console.error("Error generating badge:", error);
      res.status(500).json({ message: "Failed to generate badge" });
      return;
    }
  } catch (error: any) {
    console.error("Badge generation error:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ message: "Failed to generate badge", error: error.message });
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
    console.log(`Fetching badge for event ID: ${eventId}, attendee: ${decodedFullName}`);

    // Find the registration by event and full name
    const registration = await registrationRepository
      .createQueryBuilder('registration')
      .leftJoinAndSelect('registration.event', 'event')
      .where('registration.event.eventId = :eventId', { eventId })
      .andWhere('registration.fullName = :fullName', { fullName: decodedFullName })
      .getOne();

    if (!registration) {
      console.log(`Registration not found for event: ${eventId}, attendee: ${decodedFullName}`);
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
      console.log(`Event not found for registration: ${registration.registrationId}`);
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Check if badge already exists in database
    let badge = await badgeRepository.findOne({
      where: { registrationId: registration.registrationId }
    });

    let shouldRegenerate = false;
    
    // Check if badge exists and has a valid URL
    if (!badge || !badge.badgeUrl) {
      shouldRegenerate = true;
    }

    if (shouldRegenerate) {
      console.log(`Generating new badge for registration: ${registration.registrationId}`);
      try {
        const badgeUrl = await generateBadge(registration, registration.event);
        badge = await badgeRepository.findOne({
          where: { registrationId: registration.registrationId }
        });
      } catch (error) {
        console.error("Error generating badge:", error);
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
      res.status(200).json({
        message: "Badge found successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl: `/api/badges/events/${eventId}/attendees/${encodeURIComponent(fullName)}?download=true`
      });
    }
  } catch (error: any) {
    console.error("Badge retrieval error:", error);
    res.status(500).json({ message: "Failed to retrieve badge", error: error.message });
  }
};