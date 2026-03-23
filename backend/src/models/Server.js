import mongoose from "mongoose";

const serverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    xtreamUrl: { type: String, default: "" },
    m3uUrl: { type: String, default: "" },
    status: { type: String, enum: ["online", "offline", "maintenance"], default: "online" },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

const Server = mongoose.model("Server", serverSchema);
export default Server;
