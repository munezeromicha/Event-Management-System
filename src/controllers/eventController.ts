import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Event } from "../models/Event";
import { AuthRequest } from "../middleware/auth";
import * as eventService from "../services/eventService";

const eventRepository = AppDataSource.getRepository(Event);

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, eventType, location, description, maxCapacity, financialSupportOption } = req.body;
    
    const adminId = req.user.id;

    const eventData = {
      name,
      eventType,
      location,
      description,
      maxCapacity,
      financialSupportOption
    };

    const event = await eventService.createEvent(eventData, adminId);

    return res.status(201).json({
      message: "Event created successfully",
      event: {
        id: event.eventId,
        name: event.name,
        eventType: event.eventType,
        dateTime: event.dateTime,
        location: event.location,
        description: event.description,
        maxCapacity: event.maxCapacity,
        financialSupportOption: event.financialSupportOption
      }
    });
  } catch (error) {
    console.error("Event creation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await eventService.getAllEvents();
    return res.status(200).json({ events });
  } catch (error) {
    console.error("Get all events error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await eventService.getEventById(id);
    
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    
    return res.status(200).json({ event });
  } catch (error) {
    console.error("Get event by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    const updatedEvent = await eventService.updateEvent(id, eventData);

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: "Event updated successfully",
      event: updatedEvent
    });
  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await eventService.deleteEvent(id);
    return res.status(204).send();
  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
