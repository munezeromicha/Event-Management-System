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

// Ensure badges directory exists
const ensureBadgesDirectory = () => {
  const badgesDir = path.join(process.cwd(), 'public', 'badges');
  if (!fs.existsSync(badgesDir)) {
    fs.mkdirSync(badgesDir, { recursive: true });
  }
  return badgesDir;
};

// Helper function to get authentication from either header or query param
const getAuthUser = (req: AuthRequest) => {
  try {
    if (req.user) {
      return req.user;
    }
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

// Replace the downloadFromCloudinary function
const downloadFromCloudinary = async (url: string): Promise<Buffer> => {
  try {
    // Extract public_id from the URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL format');
    }
    
    // Get the public_id by removing the version and file extension
    const publicId = urlParts.slice(uploadIndex + 2).join('/').replace(/\.pdf$/, '');
    
    // Get the secure URL for the file
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'raw'
    });

    // Download the file using the secure_url
    const response = await axios.get(result.secure_url, {
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error downloading from Cloudinary:', error);
    throw new Error('Failed to download file from Cloudinary');
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

    // Check if badge already exists in database
    let badge = await badgeRepository.findOne({
      where: { registrationId }
    });

    // If badge doesn't exist or needs regeneration
    if (!badge || !badge.badgeUrl) {
      console.log(`Generating new badge for registration: ${registrationId}`);
      try {
        const badgeUrl = await generateBadge(registration, registration.event);
        badge = await badgeRepository.findOne({
          where: { registrationId }
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
      try {
        // Download the file from Cloudinary
        const pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="badge-${registrationId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the file
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error downloading badge:", error);
        res.status(500).json({ message: "Failed to download badge" });
      }
    } else {
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl: `/api/badges/registrations/${registrationId}?download=true`
      });
    }
  } catch (error: any) {
    console.error("Badge generation error:", error);
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

    if (!registration.event) {
      res.status(404).json({ message: "Event not found for this registration" });
      return;
    }

    // Check if badge already exists in database
    let badge = await badgeRepository.findOne({
      where: { registrationId: registration.registrationId }
    });

    // If badge doesn't exist or needs regeneration
    if (!badge || !badge.badgeUrl) {
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
      try {
        // Download the file from Cloudinary
        const pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="badge-${registration.registrationId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the file
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error downloading badge:", error);
        res.status(500).json({ message: "Failed to download badge" });
      }
    } else {
      res.status(200).json({
        message: "Badge generated successfully",
        badgeUrl: badge.badgeUrl,
        downloadUrl: `/api/badges/events/${eventId}/attendees/${encodeURIComponent(fullName)}?download=true`
      });
    }
  } catch (error: any) {
    console.error("Badge lookup error:", error);
    res.status(500).json({ message: "Failed to find badge", error: error.message });
  }
};