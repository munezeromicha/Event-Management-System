// services/badgeService.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { Badge } from '../models/Badge';
import cloudinary from '../config/cloudinary';

// Create badge repository for saving badge records
const badgeRepository = AppDataSource.getRepository(Badge);

export const generateBadge = async (registration: Registration, event: Event): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('=== Badge Generation Started ===');
      console.log('Registration ID:', registration.registrationId);
      
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp_badge_${registration.registrationId}.pdf`);
      const doc = new PDFDocument({
        size: [400, 600],
        margin: 50
      });

      const writeStream = fs.createWriteStream(tempFilePath);
      doc.pipe(writeStream);

      // Generate QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(registration.registrationId);

      // Add content to PDF
      doc
        .fontSize(20)
        .text(event.name, { align: 'center' })
        .moveDown()
        .fontSize(16)
        .text(registration.fullName, { align: 'center' })
        .moveDown()
        .fontSize(12)
        .text(`Organization: ${registration.organization || 'N/A'}`, { align: 'center' })
        .moveDown()
        .text(`Email: ${registration.email}`, { align: 'center' })
        .moveDown()
        .text(`Event Date: ${new Date(event.dateTime).toLocaleDateString()}`, { align: 'center' })
        .moveDown()
        .text(`Location: ${event.location}`, { align: 'center' })
        .moveDown()
        .text(`Registration ID: ${registration.registrationId}`, { align: 'center' })
        .moveDown();

      // Add QR Code
      doc.image(qrCodeDataUrl, {
        fit: [150, 150],
        align: 'center'
      });

      doc.end();

      writeStream.on('finish', async () => {
        try {
          console.log('PDF created, uploading to Cloudinary...');
          
          // Upload to Cloudinary with public access
          const result = await cloudinary.uploader.upload(tempFilePath, {
            resource_type: 'raw',
            public_id: `badges/badge_${registration.registrationId}`,
            format: 'pdf',
            folder: 'badges',
            overwrite: true,
            access_mode: 'public', // Ensure public access
            type: 'upload', // Upload type
            invalidate: true // Invalidate existing cache
          });

          console.log('Upload result:', {
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url
          });

          // Update or create badge record
          let badge = await badgeRepository.findOne({
            where: { registrationId: registration.registrationId }
          });

          if (badge) {
            badge.badgeUrl = result.secure_url; // Always use secure_url
            badge.qrCode = registration.registrationId;
          } else {
            badge = new Badge();
            badge.registrationId = registration.registrationId;
            badge.qrCode = registration.registrationId;
            badge.badgeUrl = result.secure_url; // Always use secure_url
          }

          await badgeRepository.save(badge);
          console.log('Badge saved to database with URL:', badge.badgeUrl);

          // Delete temp file
          fs.unlinkSync(tempFilePath);

          resolve(result.secure_url);
        } catch (error) {
          console.error('Error uploading to Cloudinary:', error);
          reject(error);
        }
      });

      writeStream.on('error', (error) => {
        console.error('Error writing PDF:', error);
        reject(error);
      });
    } catch (error) {
      console.error('Error in badge generation:', error);
      reject(error);
    }
  });
};