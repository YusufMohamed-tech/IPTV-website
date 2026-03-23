import mongoose from "mongoose";

const saleSchema = new mongoose.Schema(
  {
    resellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscription", required: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ["new", "renewal", "trial"], default: "new" }
  },
  { timestamps: true }
);

const Sale = mongoose.model("Sale", saleSchema);
export default Sale;
