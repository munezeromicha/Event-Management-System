import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";
import { Event } from "../models/Event";
import { Not, IsNull } from "typeorm";

const registrationRepository = AppDataSource.getRepository(Registration);
const eventRepository = AppDataSource.getRepository(Event);

export const scanQRCode = async (qrData: string) => {
  try {
    const data = JSON.parse(qrData);
    const { registrationId, eventId, attendeeName, nationalId } = data;

    // Verify registration exists and is approved
    const registration = await registrationRepository.findOne({
      where: { 
        registrationId,
        event: { eventId },
        status: 'approved'
      },
      relations: ['event']
    });

    if (!registration) {
      throw new Error('Invalid or unapproved registration');
    }

    // Verify attendee details match
    if (registration.fullName !== attendeeName || registration.nationalId !== nationalId) {
      throw new Error('Attendee details do not match');
    }

    // Record attendance
    registration.attendanceTime = new Date();
    await registrationRepository.save(registration);

    return {
      success: true,
      message: 'Attendance recorded successfully',
      registration: {
        id: registration.registrationId,
        name: registration.fullName,
        event: registration.event.name,
        attendanceTime: registration.attendanceTime
      }
    };
  } catch (error) {
    console.error('QR code scanning error:', error);
    throw new Error('Failed to process QR code');
  }
};

export const getEventAttendance = async (eventId: string) => {
  try {
    const registrations = await registrationRepository.find({
      where: { 
        event: { eventId },
        status: 'approved',
        attendanceTime: Not(IsNull())
      },
      relations: ['event'],
      order: { attendanceTime: 'DESC' }
    });

    return registrations.map(reg => ({
      id: reg.registrationId,
      name: reg.fullName,
      organization: reg.organization,
      attendanceTime: reg.attendanceTime
    }));
  } catch (error) {
    console.error('Get attendance error:', error);
    throw new Error('Failed to get attendance records');
  }
}; 