import { AppDataSource } from "../config/database";
import { Staff } from "../models/Staff";
import bcrypt from "bcrypt";

const seedStaff = async () => {
  await AppDataSource.initialize();

  const staffRepository = AppDataSource.getRepository(Staff);

  const existingStaff = await staffRepository.findOne({ where: { username: "staff" } });
  if (existingStaff) {
    console.log("Staff user already exists.");
    await AppDataSource.destroy();
    return;
  }

  const hashedPassword = await bcrypt.hash("staff123", 10);

  const newStaff = staffRepository.create({
    username: "staff",
    password: hashedPassword,
    role: "staff",
    fullName: "Staff User",
    email: "staff@rnit.com"
  });

  await staffRepository.save(newStaff);
  console.log("Staff user seeded successfully.");

  await AppDataSource.destroy();
};

seedStaff().catch(console.error); 