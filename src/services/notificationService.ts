import axios from 'axios';
import { Registration } from '../models/Registration';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const intouchUsername = process.env.INTOUCH_USERNAME;
const intouchPassword = process.env.INTOUCH_PASSWORD;
const intouchSenderId = process.env.INTOUCH_SENDER_ID;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

export const sendSMSNotification = async (
  registration: Registration, 
  status: 'approved' | 'rejected',
  badgeId?: string
) => {
  try {
    if (!intouchPassword || !intouchSenderId || !intouchUsername) {
      console.warn('Intouch SMS credentials not configured');
      return;
    }

    // Format phone number for Rwanda
    let phoneNumber = registration.phoneNumber;
    
    // Remove all spaces and any special characters
    phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Remove any existing country code
    if (phoneNumber.startsWith('+250')) {
      phoneNumber = phoneNumber.substring(4);
    } else if (phoneNumber.startsWith('250')) {
      phoneNumber = phoneNumber.substring(3);
    } else if (phoneNumber.startsWith('0')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    // Add country code
    phoneNumber = `250${phoneNumber}`;

    // Validate phone number format (should be 12 digits for Rwanda)
    if (!/^250\d{9}$/.test(phoneNumber)) {
      console.warn(`Invalid phone number format: ${phoneNumber}`);
      return;
    }

    let message = '';
    
    if (status === 'approved') {
      message = `Dear ${registration.fullName}, your registration for the event has been approved. `;
      if (badgeId) {
        message += `Your event badge is available at: ${baseUrl}/badges/${badgeId}`;
      }
    } else {
      message = `Dear ${registration.fullName}, we regret to inform you that your registration for the event has been rejected.`;
    }

    // Intouch SMS API parameters
    const params = new URLSearchParams({
      username: intouchUsername,
      password: intouchPassword,
      sender: intouchSenderId.replace('+', ''),
      recipient: phoneNumber,
      message: message
    });

    // Make the API request
    const response = await axios.get(
      `https://www.intouchsms.co.rw/api/sendsms/.json?${params.toString()}`
    );

    if (response.data.success) {
      console.log(`SMS notification sent successfully to ${phoneNumber}`);
    } else {
      console.warn('SMS sending failed:', response.data);
    }

  } catch (error) {
    console.error('Error sending SMS notification:', error);
    throw error; // Throwing the error to handle it at a higher level
  }
}; 