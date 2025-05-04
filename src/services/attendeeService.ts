import { AppDataSource } from "../config/database";
import { Attendee } from "../models/Attendee";

const attendeeRepository = AppDataSource.getRepository(Attendee);

export const getAllAttendees = async (): Promise<Attendee[]> => {
  return await attendeeRepository.find();
};

export const getAttendeeById = async (id: string): Promise<Attendee | null> => {
  return await attendeeRepository.findOne({ where: { attendeeId: id } });
};

export const createAttendee = async (attendeeData: Partial<Attendee>): Promise<Attendee> => {
  const attendee = attendeeRepository.create(attendeeData);
  return await attendeeRepository.save(attendee);
};

export const updateAttendee = async (id: string, attendeeData: Partial<Attendee>): Promise<Attendee | null> => {
  await attendeeRepository.update(id, attendeeData);
  return await getAttendeeById(id);
};

export const deleteAttendee = async (id: string): Promise<void> => {
  await attendeeRepository.delete(id);
};
