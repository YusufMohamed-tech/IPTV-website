import mongoose from "mongoose";
import { env } from "./env.js";

const connectDb = async () => {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: env.NODE_ENV !== "production"
  });
  console.log("MongoDB connected");
};

export default connectDb;
