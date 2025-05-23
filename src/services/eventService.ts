import { AppDataSource } from "../config/database";
import { Event } from "../models/Event";

const eventRepository = AppDataSource.getRepository(Event);

export const getAllEvents = async (): Promise<Event[]> => {
  return await eventRepository.find({
    relations: {
      admin: true,
      registrations: true,
      notifications: true,
      attendances: true
    }
  });
};

export const getEventById = async (id: string): Promise<Event | null> => {
  return await eventRepository.findOne({ where: { eventId: id } });
};

export const createEvent = async (eventData: Partial<Event>, adminId: string): Promise<Event> => {
  const event = eventRepository.create({
    ...eventData,
    admin: { adminId }
  });
  return await eventRepository.save(event);
};

export const updateEvent = async (id: string, eventData: Partial<Event>): Promise<Event | null> => {
  await eventRepository.update(id, eventData);
  return await getEventById(id);
};

export const deleteEvent = async (id: string): Promise<void> => {
  await eventRepository.delete(id);
};
