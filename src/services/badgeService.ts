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

// RNIT logo URL - use this as default logo for all badges
const DEFAULT_LOGO_URL = 'https://shora.rnit.rw/files/RNIT%20Ltd_Logo.png';

export const generateBadge = async (registration: Registration, event: Event): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create temp directory if it doesn't exist
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp_badge_${registration.registrationId}.pdf`);
      const doc = new PDFDocument({
        size: [400, 600],
        margin: 50,
        info: {
          Title: `Event Badge - ${registration.fullName}`,
          Author: 'Event Management System',
          Subject: `Badge for ${event.name}`,
        }
      });

      const writeStream = fs.createWriteStream(tempFilePath);
      doc.pipe(writeStream);

      // Generate QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(registration.registrationId);

      // Improved badge layout
      // Add RNIT logo
      try {
        // Always use the default RNIT logo
        doc.image(DEFAULT_LOGO_URL, { fit: [250, 80], align: 'center' })
          .moveDown(1);
      } catch (e) {
        console.error('Error loading logo:', e);
        // If loading the logo fails, just continue without it
        doc.moveDown(2);
      }

      // Event name with better styling
      doc.fontSize(22)
         .fillColor('#0066cc')
         .text(event.name, { align: 'center' })
         .moveDown(0.5);
      
      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(350, doc.y)
         .stroke('#dddddd')
         .moveDown(0.5);

      // Attendee name with better styling
      doc.fontSize(18)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text(registration.fullName, { align: 'center' })
         .moveDown(0.5)
         .font('Helvetica');

      // Organization with better styling
      if (registration.organization) {
        doc.fontSize(14)
           .fillColor('#666666')
           .text(registration.organization, { align: 'center' })
           .moveDown(0.5);
      }

      // Badge details in a more structured way
      doc.fontSize(12)
         .fillColor('#444444');

      // Create a two-column layout for details
      const leftColX = 70;
      const rightColX = 160;
      let detailsY = doc.y + 10;

      // Email
      doc.text('Email:', leftColX, detailsY, { continued: false });
      doc.text(registration.email || 'N/A', rightColX, detailsY, { continued: false });
      detailsY += 20;

      // Event Date
      doc.text('Event Date:', leftColX, detailsY, { continued: false });
      doc.text(new Date(event.dateTime).toLocaleDateString(), rightColX, detailsY, { continued: false });
      detailsY += 20;

      // Location
      doc.text('Location:', leftColX, detailsY, { continued: false });
      doc.text(event.location, rightColX, detailsY, { continued: false });
      detailsY += 20;

      // Registration ID (smaller and less prominent)
      doc.fontSize(8)
         .fillColor('#999999')
         .text(`ID: ${registration.registrationId}`, { align: 'center' })
         .moveDown(1.5);

      // Add QR Code with better positioning
      doc.image(qrCodeDataUrl, {
        fit: [150, 150],
        align: 'center'
      });

      // Add a note below the QR code
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Scan to verify attendance', { align: 'center' })
         .moveDown(0.5);

      // Add footer
      doc.fontSize(8)
         .fillColor('#999999')
         .text('This badge must be presented at the event entrance.', { align: 'center' })
         .moveDown(0.2)
         .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();

      writeStream.on('finish', async () => {
        try {
          // Upload to Cloudinary with enhanced security settings
          const result = await cloudinary.uploader.upload(tempFilePath, {
            resource_type: 'raw',
            public_id: `badges/badge_${registration.registrationId}`,
            format: 'pdf',
            overwrite: true,
            access_mode: 'public',
            type: 'upload',
            use_filename: true,
            unique_filename: false,
            invalidate: true
          });

          // Generate a signed URL with an expiration time
          const signedUrl = cloudinary.url(result.public_id, {
            resource_type: 'raw',
            format: 'pdf',
            secure: true,
            sign_url: true, 
            expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
          });

          // Update or create badge record
          let badge = await badgeRepository.findOne({
            where: { registrationId: registration.registrationId }
          });

          if (badge) {
            badge.badgeUrl = signedUrl;
            badge.qrCode = registration.registrationId;
          } else {
            badge = new Badge();
            badge.registrationId = registration.registrationId;
            badge.qrCode = registration.registrationId;
            badge.badgeUrl = signedUrl;
          }

          await badgeRepository.save(badge);

          // Delete temp file
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });

          resolve(signedUrl);
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