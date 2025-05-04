import { Request, Response } from "express";
import { 
  scanQRCode, 
  getEventAttendance,
  getScannedAttendees,
  getScannedAttendeesByEvent,
  updateAttendeeBank
} from "../services/attendanceService";
import { AuthRequest } from "../middleware/auth";

export const scanAttendeeQR = async (req: Request, res: Response) => {
  console.time('qrScan');
  try {
    const { qrCode } = req.body;
    
    if (!qrCode) {
      return res.status(400).json({ 
        success: false,
        message: "QR code data is required" 
      });
    }

    // Set timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), 10000); // Increased timeout to 10 seconds
    });

    // Race against timeout
    const result = await Promise.race([
      scanQRCode(qrCode),
      timeoutPromise
    ]) as any;
    
    console.timeEnd('qrScan');
    return res.status(200).json(result);
  } catch (error: any) {
    console.timeEnd('qrScan');
    console.error("QR scanning error:", error);
    
    if (error.message === "Request timed out") {
      return res.status(408).json({ 
        success: false,
        message: "Processing took too long. Please try again."
      });
    }

    if (error.message === "Invalid QR code format") {
      return res.status(400).json({
        success: false,
        message: "Invalid QR code format. Please scan a valid QR code."
      });
    }
    
    if (error.message === "Missing registration ID" || 
        error.message === "Missing event ID" ||
        error.message === "Missing attendee name") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === "QR code has expired") {
      return res.status(400).json({
        success: false,
        message: "This QR code has expired. Please use a current QR code."
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Failed to process QR code. Please try again."
    });
  }
};

export const getAttendanceList = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    if (!eventId) {
      return res.status(400).json({ 
        success: false,
        message: "Event ID is required" 
      });
    }
    
    const attendanceList = await getEventAttendance(eventId);
    
    return res.status(200).json({ 
      success: true,
      count: attendanceList.length,
      attendanceList 
    });
  } catch (error: any) {
    console.error("Get attendance list error:", error);
    return res.status(500).json({ 
      success: false,
      message: "Failed to get attendance records"
    });
  }
};

/**
 * Get all attendees whose badges have been scanned (across all events)
 */
export const getScannedAttendeesList = async (req: AuthRequest, res: Response) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validate pagination parameters - updated maximum limit to 500
    if (page < 1 || limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 500."
      });
    }
    
    // Get attendees with pagination
    const result = await getScannedAttendees(page, limit);
    
    return res.status(200).json({
      success: true,
      data: result.attendees,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Get scanned attendees error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get scanned attendees"
    });
  }
};

/**
 * Get all attendees for a specific event whose badges have been scanned
 */
export const getScannedAttendeesByEventList = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId } = req.params;
    
    // Validate event ID
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required"
      });
    }
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Validate pagination parameters - updated maximum limit to 500
    if (page < 1 || limit < 1 || limit > 500) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters. Page must be >= 1 and limit must be between 1 and 500."
      });
    }
    
    // Get attendees with pagination
    const result = await getScannedAttendeesByEvent(eventId, page, limit);
    
    return res.status(200).json({
      success: true,
      data: result.attendees,
      pagination: result.pagination
    });
  } catch (error: any) {
    console.error("Get scanned attendees by event error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get scanned attendees for the event"
    });
  }
};

/**
 * Update bank account information for an attendee
 */
export const updateAttendeeBankAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { attendanceId } = req.params;
    const { bankAccountNumber, bankName } = req.body;
    
    // Validate inputs
    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID is required"
      });
    }
    
    if (!bankAccountNumber) {
      return res.status(400).json({
        success: false,
        message: "Bank account number is required"
      });
    }
    
    if (!bankName) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required"
      });
    }
    
    // Update bank account information
    const result = await updateAttendeeBank(attendanceId, bankAccountNumber, bankName);
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Update bank account error:", error);
    
    if (error.message === "Attendee not found") {
      return res.status(404).json({
        success: false,
        message: "Attendee not found"
      });
    }
    
    if (error.message === "Bank account number is required" || 
        error.message === "Bank name is required") {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Failed to update bank account information"
    });
  }
};