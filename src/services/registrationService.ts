import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";
import { Event } from "../models/Event";
import { Admin } from "../models/Admin";
import { sendSMSNotification } from "./notificationService";
import { generateBadge } from "./badgeService";
// Import the email service functions
import { sendRegistrationEmail, sendApprovalEmail, sendRejectionEmail } from "./emailService";

const registrationRepository = AppDataSource.getRepository(Registration);
const eventRepository = AppDataSource.getRepository(Event);
const adminRepository = AppDataSource.getRepository(Admin);

export const registerForEvent = async (
  eventId: string,
  registrationData: {
    fullName: string;
    phoneNumber: string;
    nationalId?: string;
    passport?: string;
    email?: string;
    organization?: string;
  }
): Promise<Registration> => {
  // Validate identification
  if (!registrationData.nationalId && !registrationData.passport) {
    throw new Error("Either National ID or Passport is required");
  }

  if (registrationData.nationalId && registrationData.passport) {
    throw new Error("Please provide either National ID or Passport, not both");
  }

  // Validate National ID format (16 digits)
  if (registrationData.nationalId && !/^\d{16}$/.test(registrationData.nationalId)) {
    throw new Error("National ID must be exactly 16 digits");
  }

  // Validate Passport format (alphanumeric, no special characters)
  if (registrationData.passport && !/^[A-Za-z0-9]+$/.test(registrationData.passport)) {
    throw new Error("Passport number must contain only letters and numbers");
  }

  // Check if event exists
  const event = await eventRepository.findOne({ where: { eventId } });
  if (!event) {
    throw new Error("Event not found");
  }

  // Check if already registered with same identification
  const existingRegistration = await registrationRepository.findOne({
    where: [
      { event: { eventId }, nationalId: registrationData.nationalId },
      { event: { eventId }, passport: registrationData.passport }
    ]
  });

  if (existingRegistration) {
    throw new Error("Already registered for this event");
  }

  // Create registration
  const registration = registrationRepository.create({
    ...registrationData,
    event: { eventId },
    status: "pending"
  });

  const savedRegistration = await registrationRepository.save(registration);

  // Send confirmation email after registration
  if (registrationData.email) {
    try {
      await sendRegistrationEmail(savedRegistration, event);
    } catch (error) {
      console.error('Error sending registration confirmation email:', error);
      // Continue even if email fails - don't block the registration process
    }
  }

  return savedRegistration;
};

export const approveRegistration = async (
  registrationId: string,
  adminId: string
): Promise<Registration> => {
  const registration = await registrationRepository.findOne({
    where: { registrationId },
    relations: ["event"]
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  if (registration.status !== "pending") {
    throw new Error("Registration is not in pending status");
  }

  const admin = await adminRepository.findOne({ where: { adminId } });
  if (!admin) {
    throw new Error("Admin not found");
  }

  registration.status = "approved";
  registration.approvalDate = new Date();
  registration.approvedBy = adminId;
  registration.admin = admin;

  const updatedRegistration = await registrationRepository.save(registration);
  
  let badgeId;
  
  try {
    // Generate badge
    badgeId = await generateBadge(updatedRegistration, registration.event);
    
    // Send SMS notification with badge information
    await sendSMSNotification(updatedRegistration, 'approved', badgeId);
    
    // Send approval email with badge information
    if (updatedRegistration.email) {
      await sendApprovalEmail(updatedRegistration, registration.event, badgeId);
    }
  } catch (error) {
    console.error('Error in post-approval tasks:', error);
    // Continue even if badge generation, SMS, or email fails
  }

  return updatedRegistration;
};

export const rejectRegistration = async (
  registrationId: string,
  adminId: string
): Promise<Registration> => {
  const registration = await registrationRepository.findOne({
    where: { registrationId },
    relations: ["event"]
  });

  if (!registration) {
    throw new Error("Registration not found");
  }

  if (registration.status !== "pending") {
    throw new Error("Registration is not in pending status");
  }

  const admin = await adminRepository.findOne({ where: { adminId } });
  if (!admin) {
    throw new Error("Admin not found");
  }

  registration.status = "rejected";
  registration.approvalDate = new Date();
  registration.approvedBy = adminId;
  registration.admin = admin;

  const updatedRegistration = await registrationRepository.save(registration);
  
  try {
    // Send SMS notification
    await sendSMSNotification(updatedRegistration, 'rejected');
    
    // Send rejection email
    if (updatedRegistration.email) {
      await sendRejectionEmail(updatedRegistration, registration.event);
    }
  } catch (error) {
    console.error('Error in post-rejection tasks:', error);
    // Continue even if SMS or email fails
  }

  return updatedRegistration;
};

export const getPendingRegistrations = async (eventId: string): Promise<Registration[]> => {
  return await registrationRepository.find({
    where: { event: { eventId }, status: "pending" }
  });
};

export const getApprovedRegistrations = async (eventId: string): Promise<Registration[]> => {
  return await registrationRepository.find({
    where: { event: { eventId }, status: "approved" }
  });
};

export const getRegistrationsByEvent = async (eventId: string): Promise<Registration[]> => {
  return await registrationRepository.find({
    where: { event: { eventId } },
    relations: ["attendee"]
  });
};

export const getRegistrationsByAttendee = async (attendeeId: string): Promise<Registration[]> => {
  return await registrationRepository.find({
    where: { attendee: { attendeeId } },
    relations: ["event"]
  });
};

export const updateRegistrationStatus = async (
  registrationId: string,
  status: string
): Promise<Registration | null> => {
  const registration = await registrationRepository.findOne({
    where: { registrationId },
    relations: ["event"]
  });
  
  if (!registration) {
    return null;
  }
  
  const previousStatus = registration.status;
  registration.status = status;
  const updatedRegistration = await registrationRepository.save(registration);
  
  // Send appropriate email based on the new status
  if (previousStatus !== status && updatedRegistration.email) {
    try {
      if (status === 'approved') {
        const badgeId = await generateBadge(updatedRegistration, registration.event);
        await sendApprovalEmail(updatedRegistration, registration.event, badgeId);
      } else if (status === 'rejected') {
        await sendRejectionEmail(updatedRegistration, registration.event);
      }
    } catch (error) {
      console.error('Error sending status update email:', error);
      // Continue even if email fails
    }
  }
  
  return updatedRegistration;
};

export const getAllAttendees = async () => {
  try {
    const registrations = await registrationRepository.find({
      relations: ['attendee', 'event'],
      order: {
        registrationDate: 'DESC'
      },
      cache: true // Enable query caching
    });

    // Group registrations by attendee
    const attendeesMap = new Map();
    
    registrations.forEach(registration => {
      const attendee = registration.attendee;
      
      // Skip if attendee is null
      if (!attendee) {
        return;
      }

      if (!attendeesMap.has(attendee.attendeeId)) {
        attendeesMap.set(attendee.attendeeId, {
          id: attendee.attendeeId,
          fullName: attendee.fullName,
          email: attendee.email,
          phoneNumber: attendee.phoneNumber,
          nationalId: attendee.nationalId,
          organization: attendee.organization,
          registrations: []
        });
      }
      
      attendeesMap.get(attendee.attendeeId).registrations.push({
        eventId: registration.event.eventId,
        eventName: registration.event.name,
        status: registration.status,
        registrationDate: registration.registrationDate,
        approvalDate: registration.approvalDate
      });
    });

    return Array.from(attendeesMap.values());
  } catch (error) {
    console.error('Get all attendees error:', error);
    throw new Error('Failed to fetch attendees');
  }
};

export const getAllRegistrations = async () => {
  try {
    const registrations = await registrationRepository.find({
      relations: ['event', 'attendee'],
      order: {
        registrationDate: 'DESC'
      },
      cache: true
    });

    return registrations.map(registration => ({
      id: registration.registrationId,
      eventId: registration.event.eventId,
      eventTitle: registration.event.name,
      fullName: registration.fullName,
      email: registration.email,
      phoneNumber: registration.phoneNumber,
      nationalId: registration.nationalId,
      organization: registration.organization,
      status: registration.status,
      registrationDate: registration.registrationDate
    }));
  } catch (error) {
    console.error('Get all registrations error:', error);
    throw new Error('Failed to fetch registrations');
  }
};