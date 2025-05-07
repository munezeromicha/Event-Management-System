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

// Simplified direct download function
const downloadFromCloudinary = async (url: string): Promise<Buffer> => {
  try {
    console.log('Attempting to download from Cloudinary URL:', url);
    
    // Direct download approach using axios - simpler and more reliable
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf'
      }
    });

    if (!response.data || response.data.length === 0) {
      console.error('Empty response from Cloudinary download');
      throw new Error('Empty file received from Cloudinary');
    }

    console.log('Successfully downloaded file from Cloudinary, size:', response.data.length);
    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Error downloading from Cloudinary:', error.message);
    
    // Check if this is a 404 error (file not found)
    if (error.response && error.response.status === 404) {
      console.log('Badge not found in Cloudinary, attempting to regenerate...');
      throw new Error('BADGE_NOT_FOUND');
    }
    
    throw error;
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

    let shouldRegenerate = false;
    
    // Check if badge exists and has a valid URL
    if (!badge || !badge.badgeUrl) {
      shouldRegenerate = true;
    }

    if (shouldRegenerate) {
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
        let pdfBuffer: Buffer;
        
        try {
          // First try to download directly
          pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
        } catch (downloadError: any) {
          // If badge not found or other error, try to regenerate it
          if (downloadError.message === 'BADGE_NOT_FOUND') {
            console.log('Badge not found in Cloudinary, regenerating...');
            const newBadgeUrl = await generateBadge(registration, registration.event);
            
            // Get the updated badge record
            badge = await badgeRepository.findOne({
              where: { registrationId }
            });
            
            if (!badge || !badge.badgeUrl) {
              throw new Error('Failed to regenerate badge');
            }
            
            // Try downloading the regenerated badge
            pdfBuffer = await downloadFromCloudinary(badge.badgeUrl);
          } else {
            // If it's another error, re-throw it
            throw downloadError;
          }
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="badge-${registrationId}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send the file
        res.send(pdfBuffer);
      } catch (error: any) {
        console.error("Error downloading badge:", error);
        res.status(500).json({ 
          message: "Failed to download badge", 
          error: error.message 
        });
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