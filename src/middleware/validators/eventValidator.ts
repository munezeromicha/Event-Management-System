import Joi from "joi";
import { Request, Response, NextFunction } from "express";

export const validateCreateEvent = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    eventType: Joi.string().required(),
    dateTime: Joi.date().required(),
    location: Joi.string().required(),
    description: Joi.string().required(),
    maxCapacity: Joi.number().integer().min(1).required(),
    financialSupportOption: Joi.boolean().required()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }
  
  next();
};
