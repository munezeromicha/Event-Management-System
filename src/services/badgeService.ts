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
    // --- Header ---
    doc
      .rect(0, 0, 400, 80)
      .fill('#4a90e2');
    
    doc
      .fillColor('white')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(event.name, 20, 30, { width: 360, align: 'center' });

    // --- Attendee Information ---
    doc
      .fillColor('#333333')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text(registration.fullName, 20, 120, { width: 360, align: 'center' });

    // Organization (with fallback)
    doc
      .fontSize(18)
      .font('Helvetica')
      .fillColor('#666666')
      .text(registration.organization || 'Guest', 20, 400, { width: 360, align: 'center' });

    // --- Divider ---
    doc
      .moveTo(50, 200)
      .lineTo(350, 200)
      .strokeColor('#dddddd')
      .lineWidth(2)
      .stroke();

    // --- QR Code ---
    doc.image(qrCodeBuffer, 110, 220, { width: 180 });

    // --- Event Details ---
    doc
      .fillColor('#333333')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Event Details:', 50, 420);

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor('#666666')
      .text(`Date: ${formattedDate}`, 50, 450)
      .text(`Time: ${formattedTime}`, 50, 475)
      .text(`Location: ${event.location}`, 50, 500);

    // --- Footer ---
    doc
      .fillColor('#888888')
      .fontSize(11)
      .text('Please present this badge at the event entrance', 20, 550, { width: 360, align: 'center' });

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