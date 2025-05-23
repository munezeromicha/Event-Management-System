import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Attendee } from "../models/Attendee";
import * as attendeeService from "../services/attendeeService";

const attendeeRepository = AppDataSource.getRepository(Attendee);

export const createAttendee = async (req: Request, res: Response) => {
  try {
    const { fullName, phoneNumber, nationalId, email, organization } = req.body;
    
    const attendeeData = {
      fullName,
      phoneNumber,
      nationalId,
      email,
      organization
    };

    const attendee = await attendeeService.createAttendee(attendeeData);

    return res.status(201).json({
      message: "Attendee created successfully",
      attendee: {
        id: attendee.attendeeId,
        fullName: attendee.fullName,
        phoneNumber: attendee.phoneNumber,
        nationalId: attendee.nationalId,
        email: attendee.email,
        organization: attendee.organization
      }
    });
  } catch (error) {
    console.error("Attendee creation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllAttendees = async (req: Request, res: Response) => {
  try {
    const attendees = await attendeeService.getAllAttendees();
    return res.status(200).json({ attendees });
  } catch (error) {
    console.error("Get all attendees error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAttendeeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attendee = await attendeeService.getAttendeeById(parseInt(id));
    
    if (!attendee) {
      return res.status(404).json({ message: "Attendee not found" });
    }
    
    return res.status(200).json({ attendee });
  } catch (error) {
    console.error("Get attendee by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateAttendee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attendeeData = req.body;
    const updatedAttendee = await attendeeService.updateAttendee(parseInt(id), attendeeData);

    if (!updatedAttendee) {
      return res.status(404).json({ message: "Attendee not found" });
    }

    return res.status(200).json({
      message: "Attendee updated successfully",
      attendee: updatedAttendee
    });
  } catch (error) {
    console.error("Update attendee error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteAttendee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await attendeeService.deleteAttendee(parseInt(id));
    return res.status(204).send();
  } catch (error) {
    console.error("Delete attendee error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
