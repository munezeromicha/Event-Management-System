import { Request, Response } from "express";
import { generateBadge } from "../services/badgeService";
import { AppDataSource } from "../config/database";
import { Registration } from "../models/Registration";

const registrationRepository = AppDataSource.getRepository(Registration);

export const generateAttendeeBadge = async (req: Request, res: Response) => {
  try {
    const { registrationId } = req.params;

    // Get registration with event details
    const registration = await registrationRepository.findOne({
      where: { registrationId },
      relations: ['event']
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.status !== "approved") {
      return res.status(400).json({ message: "Registration is not approved" });
    }

    // Generate badge
    const badgeId = await generateBadge(registration, registration.event);

    return res.status(200).json({
      message: "Badge generated successfully",
      badgeUrl: `/badges/${badgeId}`
    });
  } catch (error: any) {
    console.error("Badge generation error:", error);
    return res.status(500).json({ message: "Failed to generate badge" });
  }
}; 