import { AppDataSource } from "../config/database";
import { Attendance } from "../models/Attendance";

// Prepare common queries for better performance
const CHECK_ATTENDANCE_QUERY = `
  SELECT "attendanceId", "fullName", "checkInTime", "bankAccountNumber", "bankName" 
  FROM attendance 
  WHERE "registrationId" = $1 AND "eventId" = $2
  LIMIT 1
`;

const GET_ATTENDEE_INFO_QUERY = `
  SELECT r."fullName", r."phoneNumber", r."email", r."organization", r."nationalId"
  FROM registration r
  WHERE r."registrationId" = $1
  LIMIT 1
`;

const INSERT_ATTENDANCE_QUERY = `
  INSERT INTO attendance 
  ("fullName", "checkInTime", "bankAccountNumber", "bankName", "registrationId", "eventId", "nationalId", "phoneNumber", "email", "organization") 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
  RETURNING "attendanceId", "fullName", "checkInTime"
`;

const GET_EVENT_ATTENDANCE_QUERY = `
  SELECT a."attendanceId" as id, a."fullName" as name, 
         a."checkInTime", a."bankAccountNumber", a."bankName", a."phoneNumber", a."email", a."organization"
  FROM attendance a
  WHERE a."eventId" = $1
  ORDER BY a."checkInTime" DESC
`;

const GET_SCANNED_ATTENDEES_QUERY = `
  SELECT 
    a."attendanceId" as id, 
    a."fullName" as name, 
    a."checkInTime", 
    a."bankAccountNumber", 
    a."bankName",
    a."phoneNumber", 
    a."email", 
    a."organization",
    a."eventId",
    a."registrationId"
  FROM attendance a
  ORDER BY a."checkInTime" DESC
  LIMIT $1 OFFSET $2
`;

const GET_SCANNED_ATTENDEES_COUNT_QUERY = `
  SELECT COUNT(*) as total FROM attendance
`;

const GET_SCANNED_ATTENDEES_BY_EVENT_QUERY = `
  SELECT 
    a."attendanceId" as id, 
    a."fullName" as name, 
    a."checkInTime", 
    a."bankAccountNumber", 
    a."bankName",
    a."phoneNumber", 
    a."email", 
    a."organization",
    a."eventId",
    a."registrationId"
  FROM attendance a
  WHERE a."eventId" = $1
  ORDER BY a."checkInTime" DESC
  LIMIT $2 OFFSET $3
`;

const GET_SCANNED_ATTENDEES_BY_EVENT_COUNT_QUERY = `
  SELECT COUNT(*) as total FROM attendance WHERE "eventId" = $1
`;

const UPDATE_BANK_INFO_QUERY = `
  UPDATE attendance
  SET "bankAccountNumber" = $1, "bankName" = $2
  WHERE "attendanceId" = $3
  RETURNING "attendanceId", "fullName", "checkInTime", "bankAccountNumber", "bankName"
`;

// Direct query approach - much faster than using relations
export const scanQRCode = async (qrData: string) => {
  try {
    // Parse QR data
    let data;
    try {
      data = JSON.parse(qrData);
    } catch (error) {
      throw new Error("Invalid QR code format");
    }
    
    // Extract data from QR code
    // Note: Updated to match the structure from your QR code example
    const { registrationId, eventId, attendee, timestamp } = data;
    
    // Validation
    if (!registrationId) throw new Error("Missing registration ID");
    if (!eventId) throw new Error("Missing event ID");
    if (!attendee) throw new Error("Missing attendee name");
    
    // Optionally check if QR code is expired (older than 24 hours)
    if (timestamp) {
      const qrTimestamp = new Date(timestamp).getTime();
      const now = Date.now();
      if (now - qrTimestamp > 24 * 60 * 60 * 1000) {
        throw new Error("QR code has expired");
      }
    }

    // Check for existing attendance using prepared statement
    const existingCheck = await AppDataSource.query(CHECK_ATTENDANCE_QUERY, [registrationId, eventId]);

    if (existingCheck && existingCheck.length > 0) {
      return {
        success: true,
        message: 'Attendee already checked in',
        attendance: {
          id: existingCheck[0].attendanceId,
          name: existingCheck[0].fullName,
          checkInTime: existingCheck[0].checkInTime,
          bankAccountNumber: existingCheck[0].bankAccountNumber || '',
          bankName: existingCheck[0].bankName || ''
        },
        alreadyExists: true
      };
    }

    // Get attendee info using prepared statement
    const attendeeInfo = await AppDataSource.query(GET_ATTENDEE_INFO_QUERY, [registrationId]);

    if (!attendeeInfo || attendeeInfo.length === 0) {
      // Fallback to using data from QR code if registration not found in database
      // Create new attendance record using QR code data
      const result = await AppDataSource.query(INSERT_ATTENDANCE_QUERY, [
        attendee, // Use name from QR code
        new Date(),
        '',
        '',
        registrationId,
        eventId,
        '', // nationalId not provided in QR code
        '', // phoneNumber not provided in QR code
        '', // email not provided in QR code
        ''  // organization not provided in QR code
      ]);

      return {
        success: true,
        message: 'Attendance recorded successfully (using QR data)',
        attendance: {
          id: result[0].attendanceId,
          name: result[0].fullName,
          checkInTime: result[0].checkInTime,
          bankAccountNumber: '',
          bankName: ''
        }
      };
    }

    // Create new attendance record using database info
    const result = await AppDataSource.query(INSERT_ATTENDANCE_QUERY, [
      attendeeInfo[0].fullName || attendee, // Prefer DB name but fall back to QR code
      new Date(),
      '',
      '',
      registrationId,
      eventId,
      attendeeInfo[0].nationalId || '',
      attendeeInfo[0].phoneNumber || '',
      attendeeInfo[0].email || '',
      attendeeInfo[0].organization || ''
    ]);

    return {
      success: true,
      message: 'Attendance recorded successfully',
      attendance: {
        id: result[0].attendanceId,
        name: result[0].fullName,
        checkInTime: result[0].checkInTime,
        bankAccountNumber: '',
        bankName: ''
      }
    };
  } catch (error: any) {
    console.error('QR code scanning error:', error);
    throw error;
  }
};

export const getEventAttendance = async (eventId: string) => {
  try {
    // Use prepared statement for better performance
    const attendances = await AppDataSource.query(GET_EVENT_ATTENDANCE_QUERY, [eventId]);
    return attendances;
  } catch (error) {
    console.error('Get attendance error:', error);
    throw new Error('Failed to get attendance records');
  }
};

/**
 * Get all attendees whose badges have been scanned, with pagination
 */
export const getScannedAttendees = async (page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Get paginated attendees
    const attendees = await AppDataSource.query(GET_SCANNED_ATTENDEES_QUERY, [limit, offset]);
    
    // Get total count for pagination
    const countResult = await AppDataSource.query(GET_SCANNED_ATTENDEES_COUNT_QUERY);
    const total = parseInt(countResult[0].total);
    
    return {
      attendees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Get scanned attendees error:', error);
    throw new Error('Failed to get scanned attendees');
  }
};

/**
 * Get all attendees for a specific event whose badges have been scanned, with pagination
 */
export const getScannedAttendeesByEvent = async (eventId: string, page = 1, limit = 10) => {
  try {
    const offset = (page - 1) * limit;
    
    // Get paginated attendees for the event
    const attendees = await AppDataSource.query(GET_SCANNED_ATTENDEES_BY_EVENT_QUERY, [eventId, limit, offset]);
    
    // Get total count for pagination
    const countResult = await AppDataSource.query(GET_SCANNED_ATTENDEES_BY_EVENT_COUNT_QUERY, [eventId]);
    const total = parseInt(countResult[0].total);
    
    return {
      attendees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Get scanned attendees by event error:', error);
    throw new Error('Failed to get scanned attendees for the event');
  }
};

/**
 * Update bank account information for an attendee
 */
export const updateAttendeeBank = async (attendanceId: string, bankAccountNumber: string, bankName: string) => {
  try {
    // Validate input
    if (!attendanceId) throw new Error("Attendance ID is required");
    if (!bankAccountNumber) throw new Error("Bank account number is required");
    if (!bankName) throw new Error("Bank name is required");
    
    // Update bank information
    const result = await AppDataSource.query(UPDATE_BANK_INFO_QUERY, [bankAccountNumber, bankName, attendanceId]);
    
    if (!result || result.length === 0) {
      throw new Error("Attendee not found");
    }
    
    return {
      success: true,
      message: 'Bank account information updated successfully',
      attendance: {
        id: result[0].attendanceId,
        name: result[0].fullName,
        checkInTime: result[0].checkInTime,
        bankAccountNumber: result[0].bankAccountNumber,
        bankName: result[0].bankName
      }
    };
  } catch (error: any) {
    console.error('Update bank information error:', error);
    throw error;
  }
};