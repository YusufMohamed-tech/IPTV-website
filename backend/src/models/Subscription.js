import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    resellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "SubscriptionPackage", required: true },
    serverId: { type: mongoose.Schema.Types.ObjectId, ref: "Server" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "trial"],
      default: "active"
    },
    isTrial: { type: Boolean, default: false },
    priceCharged: { type: Number, default: 0, min: 0 },
    autoRenew: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
export default Subscription;
