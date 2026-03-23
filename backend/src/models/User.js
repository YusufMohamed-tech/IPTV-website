import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["admin", "reseller", "client"],
      required: true,
      default: "client"
    },
    credits: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    parentReseller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastLoginAt: { type: Date },
    lastLoginDevice: { type: String, default: "N/A" },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    metadata: {
      phone: { type: String, default: "" },
      notes: { type: String, default: "" }
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
