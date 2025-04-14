import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';
import fs from 'fs';
import path from 'path';

export const generateBadge = async (registration: Registration, event: Event): Promise<string> => {
  // Create a new PDF document with larger dimensions
  const doc = new PDFDocument({
    size: [400, 600], // Increased size for better readability
    margin: 10
  });

  // Create a unique filename
  const badgeId = `badge_${registration.registrationId}.pdf`;
  const outputPath = path.join(__dirname, '../../public/badges', badgeId);

  // Ensure the badges directory exists
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }

  // Create a write stream
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Generate QR code data
  const qrData = JSON.stringify({
    registrationId: registration.registrationId,
    eventId: event.eventId,
    attendeeName: registration.fullName,
    nationalId: registration.nationalId
  });

  // Generate QR code as buffer
  const qrCodeBuffer = await QRCode.toBuffer(qrData, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 150 // Increased QR code size
  });

  // Add badge design
  doc
    // Header background
    .rect(0, 0, 400, 80)
    .fill('#4a90e2')
    
    // Event name (in white on blue background)
    .fillColor('white')
    .fontSize(24)
    .text(event.name, 0, 30, { align: 'center' })

    // Main content
    .fillColor('black')
    
    // Attendee name
    .fontSize(32)
    .text(registration.fullName, 0, 120, { align: 'center' })

    // Organization
    .fontSize(18)
    .text(registration.organization || 'Guest', 0, 170, { align: 'center' })

    // Divider line
    .moveTo(50, 200)
    .lineTo(350, 200)
    .stroke()

    // QR Code (centered)
    .image(qrCodeBuffer, 125, 230, { width: 150 })

    // Event details
    .fontSize(14)
    .text('Event Details:', 50, 400)
    .fontSize(12)
    .text(`Date: ${event.dateTime.toLocaleDateString()}`, 50, 430)
    .text(`Time: ${event.dateTime.toLocaleTimeString()}`, 50, 450)
    .text(`Location: ${event.location}`, 50, 470)

    // Footer
    .fontSize(10)
    .text('Please present this badge at the event entrance', 0, 550, { align: 'center' });

  // Finalize the PDF
  doc.end();

  // Wait for the stream to finish
  await new Promise<void>((resolve) => stream.on('finish', resolve));

  return badgeId;
}; 