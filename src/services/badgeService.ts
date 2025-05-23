// services/badgeService.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { Badge } from '../models/Badge';

// Create badge repository for saving badge records
const badgeRepository = AppDataSource.getRepository(Badge);

export const generateBadge = async (registration: Registration, event: Event): Promise<string> => {
  try {
    // Create a new PDF document with better dimensions for a badge
    const doc = new PDFDocument({
      size: [400, 600],
      margin: 10,
      bufferPages: true // Enable buffer pages for better control
    });

    // Create a unique filename
    const badgeId = `badge_${registration.registrationId}.pdf`;
    
    // Define paths
    const badgesDir = path.join(process.cwd(), 'public', 'badges');
    const outputPath = path.join(badgesDir, badgeId);
    const logoPath = path.join(process.cwd(), 'public', 'images', 'rnit-logo.png');

    // Ensure the badges directory exists
    if (!fs.existsSync(badgesDir)) {
      fs.mkdirSync(badgesDir, { recursive: true });
    }

    // Create a write stream
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Parse date correctly (handle both Date objects and strings)
    const eventDate = typeof event.dateTime === 'string' 
      ? new Date(event.dateTime) 
      : event.dateTime;
    
    // Format the date and time for display
    const formattedDate = eventDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const formattedTime = eventDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Generate QR code data with essential info for verification
    const qrData = JSON.stringify({
      registrationId: registration.registrationId,
      eventId: event.eventId,
      attendee: registration.fullName,
      timestamp: new Date().toISOString()
    });

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M', // Medium error correction for better readability
      margin: 1,
      width: 180
    });

    // Enhanced badge design with better visual hierarchy
    // --- Header with RNIT Logo ---
    doc
      .rect(0, 0, 400, 100)
      .fill('#4a90e2');
    
    // Add RNIT logo if it exists
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 150, 10, { width: 100 });
    } else {
      // Fallback to text if logo is not available
      doc
        .fillColor('white')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('RNIT', 20, 40, { width: 360, align: 'center' });
    }

    // --- Attendee Information ---
    doc
      .fillColor('#333333')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text(registration.fullName, 20, 140, { width: 360, align: 'center' });

    // Organization (with fallback)
    doc
      .fontSize(18)
      .font('Helvetica')
      .fillColor('#666666')
      .text(registration.organization || 'Guest', 20, 420, { width: 360, align: 'center' });

    // --- Divider ---
    doc
      .moveTo(50, 220)
      .lineTo(350, 220)
      .strokeColor('#dddddd')
      .lineWidth(2)
      .stroke();

    // --- QR Code ---
    doc.image(qrCodeBuffer, 110, 240, { width: 180 });

    // --- Event Details ---
    doc
      .fillColor('#333333')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Event Details:', 50, 440);

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Date: ${formattedDate}`, 50, 470)
      .text(`Time: ${formattedTime}`, 50, 495)
      .text(`Location: ${event.location}`, 50, 520);

    // --- Footer ---
    doc
      .fillColor('#888888')
      .fontSize(11)
      .text('Please present this badge at the event entrance', 20, 570, { width: 360, align: 'center' });

    // Add a border to the entire badge
    doc
      .rect(5, 5, 390, 590)
      .strokeColor('#dddddd')
      .lineWidth(1)
      .stroke();

    // Finalize the PDF
    doc.end();

    // Wait for the stream to finish
    await new Promise<void>((resolve) => stream.on('finish', resolve));

    // Save badge reference in the database
    const badge = new Badge();
    badge.registrationId = registration.registrationId;
    badge.qrCode = qrData;
    await badgeRepository.save(badge);

    return badgeId;
  } catch (error) {
    console.error('Error generating badge:', error);
    throw error;
  }
};