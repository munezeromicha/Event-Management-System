import { Request, Response } from "express";
import * as registrationService from "../services/registrationService";
import { AuthRequest } from "../middleware/auth";

export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { fullName, phoneNumber, nationalId, passport, email, organization } = req.body;

    const registration = await registrationService.registerForEvent(eventId, {
      fullName,
      phoneNumber,
      nationalId,
      passport,
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
    if (error.message === "Already registered for this event") {
      return res.status(409).json({ 
        message: "You have already registered for this event",
        code: "DUPLICATE_REGISTRATION"
      });
    }
    if (error.message === "Event not found") {
      return res.status(404).json({ 
        message: "The event you are trying to register for does not exist",
        code: "EVENT_NOT_FOUND"
      });
    }
    if (error.message === "Either National ID or Passport is required") {
      return res.status(400).json({ 
        message: error.message,
        code: "ID_REQUIRED"
      });
    }
    if (error.message === "Please provide either National ID or Passport, not both") {
      return res.status(400).json({ 
        message: error.message,
        code: "DUPLICATE_ID"
      });
    }
    if (error.message === "National ID must be exactly 16 digits") {
      return res.status(400).json({ 
        message: error.message,
        code: "INVALID_NATIONAL_ID"
      });
    }
    if (error.message === "Passport number must contain only letters and numbers") {
      return res.status(400).json({ 
        message: error.message,
        code: "INVALID_PASSPORT"
      });
    }
    return res.status(400).json({ 
      message: error.message || "Registration failed",
      code: "REGISTRATION_ERROR"
    });
  }
};

export const approveRegistration = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { registrationId } = req.params;
    const adminId = req.user.id;

    const registration = await registrationService.approveRegistration(registrationId, adminId);

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
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { registrationId } = req.params;
    const adminId = req.user.id;

    const registration = await registrationService.rejectRegistration(registrationId, adminId);

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

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status value. Status must be one of: pending, approved, rejected" 
      });
    }

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

export const getAllAttendees = async (req: AuthRequest, res: Response) => {
  try {
    const attendees = await registrationService.getAllAttendees();
    
    return res.status(200).json(attendees);
  } catch (error) {
    console.error("Get all attendees error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllRegistrations = async (req: AuthRequest, res: Response) => {
  try {
    const registrations = await registrationService.getAllRegistrations();
    
    return res.status(200).json(registrations);
  } catch (error) {
    console.error("Get all registrations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};