import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Event } from "../models/Event";
import { AuthRequest } from "../middleware/auth";
import * as eventService from "../services/eventService";

const eventRepository = AppDataSource.getRepository(Event);

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { 
      name, 
      eventType, 
      location, 
      description, 
      maxCapacity, 
      financialSupportOption,
      date,
      time 
    } = req.body;
    
    const adminId = req.user.id;

    // Combine date and time into a single DateTime object
    const dateTime = new Date(`${date}T${time}`);

    const eventData = {
      name,
      eventType,
      location,
      description,
      maxCapacity,
      financialSupportOption,
      dateTime
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
    return res.status(200).json(events);
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

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      eventType, 
      location, 
      description, 
      maxCapacity, 
      financialSupportOption,
      date,
      time 
    } = req.body;

    // Prepare the update data
    const updateData: any = {};

    // Only include fields that are provided in the request
    if (name !== undefined) updateData.name = name;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (maxCapacity !== undefined) updateData.maxCapacity = maxCapacity;
    if (financialSupportOption !== undefined) updateData.financialSupportOption = financialSupportOption;

    // Only update dateTime if both date and time are provided
    if (date && time) {
      const dateTime = new Date(`${date}T${time}`);
      if (!isNaN(dateTime.getTime())) { // Check if the date is valid
        updateData.dateTime = dateTime;
      }
    }

    const updatedEvent = await eventService.updateEvent(id, updateData);

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: "Event updated successfully",
      event: {
        id: updatedEvent.eventId,
        name: updatedEvent.name,
        eventType: updatedEvent.eventType,
        dateTime: updatedEvent.dateTime,
        location: updatedEvent.location,
        description: updatedEvent.description,
        maxCapacity: updatedEvent.maxCapacity,
        financialSupportOption: updatedEvent.financialSupportOption
      }
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
