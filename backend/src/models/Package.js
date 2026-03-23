import mongoose from "mongoose";

const channelListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    channels: [{ type: String }],
    url: { type: String, default: "" }
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    durationDays: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    channelLists: [channelListSchema],
    serverIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Server" }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const SubscriptionPackage = mongoose.model("SubscriptionPackage", packageSchema);
export default SubscriptionPackage;
