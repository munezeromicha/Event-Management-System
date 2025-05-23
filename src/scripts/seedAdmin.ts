import { AppDataSource } from "../config/database";
import { Admin } from "../models/Admin";
import bcrypt from "bcrypt";

const seedAdmin = async () => {
  await AppDataSource.initialize();

  const adminRepository = AppDataSource.getRepository(Admin);

  const existingAdmin = await adminRepository.findOne({ where: { username: "admin" } });
  if (existingAdmin) {
    console.log("Admin user already exists.");
    await AppDataSource.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash("password", 10);

  const newAdmin = adminRepository.create({
    username: "admin",
    password: hashedPassword,
  });

  await adminRepository.save(newAdmin);
  console.log("Admin user seeded successfully.");

  await AppDataSource.destroy();
};

seedAdmin().catch(console.error);
