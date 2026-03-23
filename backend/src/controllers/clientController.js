import Subscription from "../models/Subscription.js";
import { logActivity } from "../services/activityService.js";

export const getClientDashboard = async (req, res, next) => {
  try {
    const subscriptions = await Subscription.find({ clientId: req.user._id })
      .populate("packageId", "name durationDays")
      .populate("serverId", "name status")
      .sort({ createdAt: -1 })
      .lean();

    const activeSubscription = subscriptions.find((sub) => ["active", "trial"].includes(sub.status));

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "client.dashboard.view",
      targetType: "user",
      targetId: req.user._id
    });

    res.json({
      profile: {
        fullName: req.user.fullName,
        email: req.user.email,
        lastLoginAt: req.user.lastLoginAt,
        lastLoginDevice: req.user.lastLoginDevice
      },
      activeSubscription,
      subscriptions
    });
  } catch (error) {
    next(error);
  }
};
