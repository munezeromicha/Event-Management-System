import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";
import { Event } from "../models/Event";
import { Admin } from "../models/Admin";
import { sendSMSNotification } from "./notificationService";
import { generateBadge } from "./badgeService";

const registrationRepository = AppDataSource.getRepository(Registration);
const eventRepository = AppDataSource.getRepository(Event);
const adminRepository = AppDataSource.getRepository(Admin);

export const registerForEvent = async (
  eventId: string,
  registrationData: {
    fullName: string;
    phoneNumber: string;
    nationalId: string;
    email?: string;
    organization?: string;
  }
): Promise<Registration> => {
  // Check if event exists
  const event = await eventRepository.findOne({ where: { eventId } });
  if (!event) {
    throw new Error("Event not found");
  }

  // Check if already registered with same nationalId
  const existingRegistration = await registrationRepository.findOne({
    where: { event: { eventId }, nationalId: registrationData.nationalId }
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

  return await registrationRepository.save(registration);
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
  
  // Generate badge
  const badgeId = await generateBadge(updatedRegistration, registration.event);
  
  // Send SMS notification with badge information
  await sendSMSNotification(updatedRegistration, 'approved', badgeId);

  return updatedRegistration;
};

export const rejectRegistration = async (
  registrationId: string,
  adminId: string
): Promise<Registration> => {
  const registration = await registrationRepository.findOne({
    where: { registrationId }
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
  
  // Send SMS notification
  await sendSMSNotification(updatedRegistration, 'rejected');

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
  await registrationRepository.update(registrationId, { status });
  return await registrationRepository.findOne({
    where: { registrationId },
    relations: ["event", "attendee"]
  });
}; 