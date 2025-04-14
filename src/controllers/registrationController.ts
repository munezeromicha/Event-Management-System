import { Request, Response } from "express";
import * as registrationService from "../services/registrationService";
import { AuthRequest } from "../middleware/auth";

export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { fullName, phoneNumber, nationalId, email, organization } = req.body;

    const registration = await registrationService.registerForEvent(eventId, {
      fullName,
      phoneNumber,
      nationalId,
      email,
      organization
    });

    return res.status(201).json({
      message: "Registration submitted successfully",
      registration: {
        id: registration.registrationId,
        status: registration.status,
        registrationDate: registration.registrationDate
      }
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const approveRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;
    const adminId = req.user.id;

    const registration = await registrationService.approveRegistration(registrationId, adminId);

    // TODO: Send SMS and email notifications
    // sendNotification(registration.phoneNumber, registration.email, "approved");

    return res.status(200).json({
      message: "Registration approved successfully",
      registration
    });
  } catch (error: any) {
    console.error("Approval error:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const rejectRegistration = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;
    const adminId = req.user.id;

    const registration = await registrationService.rejectRegistration(registrationId, adminId);

    // TODO: Send SMS and email notifications
    // sendNotification(registration.phoneNumber, registration.email, "rejected");

    return res.status(200).json({
      message: "Registration rejected",
      registration
    });
  } catch (error: any) {
    console.error("Rejection error:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getPendingRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const registrations = await registrationService.getPendingRegistrations(eventId);
    return res.status(200).json({ registrations });
  } catch (error: any) {
    console.error("Get pending registrations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getApprovedRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const registrations = await registrationService.getApprovedRegistrations(eventId);
    return res.status(200).json({ registrations });
  } catch (error: any) {
    console.error("Get approved registrations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventRegistrations = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const registrations = await registrationService.getRegistrationsByEvent(eventId);
    return res.status(200).json({ registrations });
  } catch (error) {
    console.error("Get event registrations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAttendeeRegistrations = async (req: Request, res: Response) => {
  try {
    const { attendeeId } = req.params;
    const registrations = await registrationService.getRegistrationsByAttendee(attendeeId);
    return res.status(200).json({ registrations });
  } catch (error) {
    console.error("Get attendee registrations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateRegistrationStatus = async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.params;
    const { status } = req.body;

    const registration = await registrationService.updateRegistrationStatus(registrationId, status);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    return res.status(200).json({
      message: "Registration status updated successfully",
      registration
    });
  } catch (error) {
    console.error("Update registration status error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}; 