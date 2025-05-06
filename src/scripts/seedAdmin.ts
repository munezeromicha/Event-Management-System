import { AppDataSource } from "../config/database";
import { Admin } from "../models/Admin";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

const seedAdmin = async () => {
  try {
    console.log("Initializing database connection...");
    await AppDataSource.initialize();
    console.log("Database connection initialized successfully");

    const adminRepository = AppDataSource.getRepository(Admin);

    const existingAdmin = await adminRepository.findOne({ where: { username: ADMIN_USERNAME } });
    if (existingAdmin) {
      console.log("Admin user already exists.");
      await AppDataSource.destroy();
      return;
    }

    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const newAdmin = adminRepository.create({
      username: ADMIN_USERNAME,
      password: hashedPassword,
    });

    await adminRepository.save(newAdmin);
    console.log("Admin user seeded successfully.");

    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin().catch(console.error);
