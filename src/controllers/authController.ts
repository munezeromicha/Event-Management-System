import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { Admin } from "../models/Admin";
import { generateToken } from "../utils/jwt";

const adminRepository = AppDataSource.getRepository(Admin);

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const admin = await adminRepository.findOne({ where: { username } });

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken({ id: admin.adminId, role: "admin" });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: admin.adminId,
        username: admin.username
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
