import "dotenv/config";
import connectDb from "../config/db.js";
import User from "../models/User.js";

const upsertUser = async ({ fullName, email, password, role, credits = 0, metadata = {} }) => {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail }).select("+password");

  if (!user) {
    user = new User({
      fullName,
      email: normalizedEmail,
      password,
      role,
      credits,
      metadata
    });

    await user.save();
    return { user, created: true };
  }

  user.fullName = fullName;
  user.role = role;
  user.isActive = true;
  user.password = password;
  user.metadata = {
    phone: metadata.phone || user.metadata?.phone || "",
    notes: metadata.notes || user.metadata?.notes || ""
  };

  if (role === "reseller") {
    user.credits = Math.max(user.credits || 0, credits);
  }

  await user.save();
  return { user, created: false };
};

const seedDefaultUsers = async () => {
  await connectDb();

  const adminConfig = {
    fullName: process.env.ADMIN_FULL_NAME || "Yusuf Admin",
    email: process.env.ADMIN_EMAIL || "yusufmohamedyak55@gmail.com",
    password: process.env.ADMIN_PASSWORD || "yusuf@55555",
    role: "admin",
    metadata: {
      phone: process.env.ADMIN_PHONE || "197325",
      notes: "Provisioned by seed-default-users"
    }
  };

  const resellerConfig = {
    fullName: process.env.RESELLER_FULL_NAME || "Mohamed Reseller",
    email: process.env.RESELLER_EMAIL || "01129186518kk@gmail.com",
    password: process.env.RESELLER_PASSWORD || "mohamed@55555",
    role: "reseller",
    credits: Number(process.env.RESELLER_CREDITS || 100),
    metadata: {
      phone: process.env.RESELLER_PHONE || "",
      notes: "Provisioned by seed-default-users"
    }
  };

  const adminResult = await upsertUser(adminConfig);
  const resellerResult = await upsertUser(resellerConfig);

  console.log(`Admin ${adminResult.created ? "created" : "updated"}: ${adminResult.user.email}`);
  console.log(`Reseller ${resellerResult.created ? "created" : "updated"}: ${resellerResult.user.email}`);
  process.exit(0);
};

seedDefaultUsers().catch((error) => {
  console.error("Failed to seed default users:", error);
  process.exit(1);
});
