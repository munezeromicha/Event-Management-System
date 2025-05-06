import nodemailer from 'nodemailer';
import { Registration } from '../models/Registration';
import { Event } from '../models/Event';

// Configure email transport
// For production, use actual SMTP credentials
// For development, you can use services like Ethereal or Mailtrap
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'munezerontaganiramichel@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  }
});

// RNIT branding colors
const RNIT_PRIMARY_COLOR = '#0047AB'; // Deep blue
const RNIT_SECONDARY_COLOR = '#4169E1'; // Royal blue
const RNIT_ACCENT_COLOR = '#87CEEB'; // Sky blue

/**
 * Create a responsive email template with RNIT branding
 */
const createEmailTemplate = (title: string, content: string, buttonText?: string, buttonUrl?: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9f9f9;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 3px solid ${RNIT_PRIMARY_COLOR};
        }
        .logo {
          max-width: 180px;
          height: auto;
        }
        .content {
          padding: 30px 20px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
          background-color: #f5f5f5;
          border-top: 1px solid #ddd;
          border-radius: 0 0 8px 8px;
        }
        h1 {
          color: ${RNIT_PRIMARY_COLOR};
          margin-top: 0;
        }
        .button {
          display: inline-block;
          background-color: ${RNIT_PRIMARY_COLOR};
          color: white !important;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 4px;
          font-weight: bold;
          margin: 20px 0;
          border: none;
          cursor: pointer;
          text-align: center;
        }
        .button:hover {
          background-color: ${RNIT_SECONDARY_COLOR};
        }
        .highlight {
          background-color: #f8f9fa;
          border-left: 4px solid ${RNIT_ACCENT_COLOR};
          padding: 15px;
          margin: 20px 0;
        }
        .social-links {
          margin-top: 15px;
        }
        .social-link {
          margin: 0 10px;
          text-decoration: none;
          color: ${RNIT_PRIMARY_COLOR};
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://shora.rnit.rw/files/RNIT%20Ltd_Logo.png" alt="RNIT Logo" class="logo">
          <h1>${title}</h1>
        </div>
        <div class="content">
          ${content}
          ${buttonText && buttonUrl ? 
            `<div style="text-align: center;">
              <a href="${buttonUrl}" class="button">${buttonText}</a>
            </div>` : 
            ''}
        </div>
        <div class="footer">
          <p>Rwanda National Investment Trust (RNIT)</p>
          <p>Former Cogebanque Building 6th Floor , KN 63 St Kigali , Rwanda | 5890</p>
          <div class="social-links">
            <a href="https://x.com/rnit_Rwanda" class="social-link">X</a>
            <a href="https://www.instagram.com/rnit_iteramberefund/" class="social-link">Instagram</a>
            <a href="https://www.facebook.com/rnitrwanda" class="social-link">Facebook</a>
            <a href="https://www.youtube.com/@RNIT-IterambereFund/videos" class="social-link">YouTube</a>
          </div>
          <p>&copy; ${new Date().getFullYear()} RNIT Rwanda. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send registration confirmation email
 */
export const sendRegistrationEmail = async (registration: Registration, event: Event): Promise<void> => {
  // Skip if no email is provided
  if (!registration.email) {
    console.warn(`No email address for registration ${registration.registrationId}`);
    return;
  }

  const content = `
    <p>Dear ${registration.fullName},</p>
    
    <p>Thank you for registering for <strong>${event.name}</strong>. We have received your registration and it is currently being reviewed by our team.</p>
    
    <div class="highlight">
      <p><strong>Registration Details:</strong></p>
      <p>Event: ${event.name}</p>
      <p>Date: ${new Date(event.dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>Time: ${new Date(event.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
      <p>Location: ${event.location}</p>
    </div>
    
    <p>You will receive another email once your registration has been reviewed. For any questions, please contact our support team at <a href="mailto:info@rnit.rw">info@rnit.rw</a>.</p>
    
    <p>We look forward to your participation!</p>
    
    <p>Best regards,<br>The RNIT Events Team</p>
  `;

  const mailOptions = {
    from: `"RNIT Events" <munezerontaganiramichel@gmail.com>`,
    to: registration.email,
    subject: `Registration Confirmation: ${event.name}`,
    html: createEmailTemplate('Registration Received', content)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Registration confirmation email sent to ${registration.email}`);
  } catch (error) {
    console.error('Error sending registration confirmation email:', error);
  }
};

/**
 * Send registration approval email
 */
export const sendApprovalEmail = async (registration: Registration, event: Event, badgeId?: string): Promise<void> => {
  // Skip if no email is provided
  if (!registration.email) {
    console.warn(`No email address for registration ${registration.registrationId}`);
    return;
  }

  const eventDate = new Date(event.dateTime);
  const formattedDate = eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const content = `
    <p>Dear ${registration.fullName},</p>
    
    <p>We are pleased to inform you that your registration for <strong>${event.name}</strong> has been <strong style="color: green;">approved</strong>!</p>
    
    <div class="highlight">
      <p><strong>Event Details:</strong></p>
      <p>Event: ${event.name}</p>
      <p>Date: ${formattedDate}</p>
      <p>Time: ${formattedTime}</p>
      <p>Location: ${event.location}</p>
      <p><strong>Badge:</strong> will be provided at the event entrance</p>
    </div>
    
    <p>Please save this email for your records. You will need to present your badge (digital or printed) at the event entrance.</p>
    
    <p>If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:info@rnit.rw">info@rnit.rw</a>.</p>
    
    <p>We look forward to seeing you at the event!</p>
    
    <p>Best regards,<br>The RNIT Events Team</p>
  `;

  const mailOptions = {
    from: `"RNIT Events" <munezerontaganiramichel@gmail.com>`,
    to: registration.email,
    subject: `Registration Approved: ${event.name}`,
    html: createEmailTemplate('Registration Approved', content, 'View Event Details', `http://localhost:3000/api/events/${event.eventId}`)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${registration.email}`);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
};

/**
 * Send registration rejection email
 */
export const sendRejectionEmail = async (registration: Registration, event: Event): Promise<void> => {
  // Skip if no email is provided
  if (!registration.email) {
    console.warn(`No email address for registration ${registration.registrationId}`);
    return;
  }

  const content = `
    <p>Dear ${registration.fullName},</p>
    
    <p>Thank you for your interest in attending <strong>${event.name}</strong>.</p>
    
    <p>After careful review, we regret to inform you that your registration could not be approved at this time. This could be due to various reasons, such as:</p>
    
    <ul>
      <li>The event has reached its maximum capacity</li>
      <li>Incomplete or incorrect registration information</li>
      <li>The event requirements do not match with the provided details</li>
    </ul>
    
    <p>If you believe this decision was made in error or would like more information, please contact our support team at <a href="mailto:info@rnit.rw">info@rnit.rw</a>.</p>
    
    <p>We encourage you to explore other RNIT events that might interest you.</p>
    
    <p>Best regards,<br>The RNIT Events Team</p>
  `;

  const mailOptions = {
    from: `"RNIT Events" <munezerontaganiramichel@gmail.com>`,
    to: registration.email,
    subject: `Registration Status: ${event.name}`,
    html: createEmailTemplate('Registration Status Update', content, 'Explore Other Events', 'http://localhost:3000/api/events')
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Rejection email sent to ${registration.email}`);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
};