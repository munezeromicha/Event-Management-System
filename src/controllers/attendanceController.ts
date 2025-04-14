import { Request, Response } from "express";
import { scanQRCode, getEventAttendance } from "../services/attendanceService";
import { AuthRequest } from "../middleware/auth";

export const scanAttendeeQR = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({ message: "QR code data is required" });
    }

    const result = await scanQRCode(qrData);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("QR scanning error:", error);
    return res.status(400).json({ message: error.message });
  }
};

export const getAttendanceList = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    const attendanceList = await getEventAttendance(eventId);
    return res.status(200).json({ attendanceList });
  } catch (error: any) {
    console.error("Get attendance list error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}; 