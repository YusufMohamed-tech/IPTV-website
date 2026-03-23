import dotenv from "dotenv";
import connectDb from "../config/db.js";
import User from "../models/User.js";

dotenv.config();

const seedAdmin = async () => {
  await connectDb();

  const email = process.env.ADMIN_EMAIL || "admin@iptv.local";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const exists = await User.findOne({ email });
  if (exists) {
    console.log("Admin already exists");
    process.exit(0);
  }

  await User.create({
    fullName: "System Admin",
    email,
    password,
    role: "admin"
  });

  console.log("Admin user created successfully");
  process.exit(0);
};

seedAdmin().catch((error) => {
  console.error("Failed to seed admin:", error);
  process.exit(1);
});
