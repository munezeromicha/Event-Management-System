import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { Staff } from "../models/Staff";
import { generateToken } from "../utils/jwt";
import { Registration } from "../models/Registration";
import { Attendance } from "../models/Attendance";

const staffRepository = AppDataSource.getRepository(Staff);
const registrationRepository = AppDataSource.getRepository(Registration);
const attendanceRepository = AppDataSource.getRepository(Attendance);

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const staff = await staffRepository.findOne({ where: { username } });

    if (!staff) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, staff.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({ id: staff.staffId, role: staff.role });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: staff.staffId,
        username: staff.username,
        role: staff.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const scanBadge = async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.body;

    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ["attendee", "event"]
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Registration is not approved" });
    }

    // Check if attendance already exists
    const existingAttendance = await attendanceRepository.findOne({
      where: { registrationId }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: "Attendee already checked in" });
    }

    // Create new attendance record
    const attendance = attendanceRepository.create({
      registrationId,
      eventId: registration.event.eventId,
      fullName: registration.fullName,
      checkInTime: new Date(),
      nationalId: registration.nationalId,
      phoneNumber: registration.phoneNumber,
      email: registration.email,
      organization: registration.organization
    });

    await attendanceRepository.save(attendance);

    return res.status(200).json({
      message: "Badge scanned successfully",
      attendance
    });
  } catch (error) {
    console.error("Badge scanning error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getScannedAttendees = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const attendances = await attendanceRepository.find({
      where: { eventId },
      relations: ["registration", "event"],
      order: { checkInTime: "DESC" }
    });

    return res.status(200).json({
      message: "Scanned attendees retrieved successfully",
      attendances
    });
  } catch (error) {
    console.error("Error retrieving scanned attendees:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}; 