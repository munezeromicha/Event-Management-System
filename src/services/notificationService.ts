import twilio from 'twilio';
import { Registration } from '../models/Registration';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

const client = twilio(accountSid, authToken);

export const sendSMSNotification = async (
  registration: Registration, 
  status: 'approved' | 'rejected',
  badgeId?: string
) => {
  try {
    if (!twilioPhoneNumber) {
      throw new Error('Twilio phone number not configured');
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

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: registration.phoneNumber
    });

    console.log(`SMS notification sent to ${registration.phoneNumber}`);
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    throw new Error('Failed to send SMS notification');
  }
}; 