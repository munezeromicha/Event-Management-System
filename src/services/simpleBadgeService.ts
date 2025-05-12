import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { Badge } from '../models/Badge';

// Create badge repository
const badgeRepository = AppDataSource.getRepository(Badge);

// RNIT logo URL
const DEFAULT_LOGO_URL = 'https://shora.rnit.rw/files/RNIT%20Ltd_Logo.png';

export const generateBadge = async (registration: Registration, event: Event): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('=== Badge Generation Started ===');
      console.log('Registration ID:', registration.registrationId);
      
      // Create badges directory if it doesn't exist
      const badgesDir = path.join(process.cwd(), 'public', 'badges');
      if (!fs.existsSync(badgesDir)) {
        fs.mkdirSync(badgesDir, { recursive: true });
      }

      // Create a unique filename for this badge
      const filename = `badge_${registration.registrationId}.pdf`;
      const filePath = path.join(badgesDir, filename);
      
      // Create a writable stream for the PDF
      const doc = new PDFDocument({
        size: [400, 600],
        margin: 50,
        info: {
          Title: `Event Badge - ${registration.fullName}`,
          Author: 'Event Management System',
          Subject: `Badge for ${event.name}`,
        }
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Generate QR Code
      const qrCodeDataUrl = await QRCode.toDataURL(registration.registrationId);

      // Add RNIT logo
      try {
        doc.image(DEFAULT_LOGO_URL, { fit: [250, 80], align: 'center' })
          .moveDown(1);
      } catch (e) {
        console.error('Error loading logo:', e);
        doc.moveDown(2);
      }

      // Event name with styling
      doc.fontSize(22)
         .fillColor('#0066cc')
         .text(event.name, { align: 'center' })
         .moveDown(0.5);
      
      // Horizontal line
      doc.moveTo(50, doc.y)
         .lineTo(350, doc.y)
         .stroke('#dddddd')
         .moveDown(0.5);

      // Attendee name with styling
      doc.fontSize(18)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text(registration.fullName, { align: 'center' })
         .moveDown(0.5)
         .font('Helvetica');

      // Organization if available
      if (registration.organization) {
        doc.fontSize(14)
           .fillColor('#666666')
           .text(registration.organization, { align: 'center' })
           .moveDown(0.5);
      }

      // Badge details
      doc.fontSize(12)
         .fillColor('#444444');

      // Two-column layout for details
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

      // Registration ID
      doc.fontSize(8)
         .fillColor('#999999')
         .text(`ID: ${registration.registrationId}`, { align: 'center' })
         .moveDown(1.5);

      // Add QR Code
      doc.image(qrCodeDataUrl, {
        fit: [150, 150],
        align: 'center'
      });

      // Note below QR code
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Scan to verify attendance', { align: 'center' })
         .moveDown(0.5);

      // Footer
      doc.fontSize(8)
         .fillColor('#999999')
         .text('This badge must be presented at the event entrance.', { align: 'center' })
         .moveDown(0.2)
         .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      doc.end();

      writeStream.on('finish', async () => {
        try {
          // Create the badge URL - this will be a local URL that points to our file
          const badgeUrl = `/badges/${filename}`;
          
          // Update or create badge record in database
          let badge = await badgeRepository.findOne({
            where: { registrationId: registration.registrationId }
          });

          if (badge) {
            badge.badgeUrl = badgeUrl;
            badge.qrCode = registration.registrationId;
          } else {
            badge = new Badge();
            badge.registrationId = registration.registrationId;
            badge.qrCode = registration.registrationId;
            badge.badgeUrl = badgeUrl;
          }

          await badgeRepository.save(badge);
          console.log('Badge saved to database with URL:', badge.badgeUrl);

          resolve(badgeUrl);
        } catch (error) {
          console.error('Error saving badge to database:', error);
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