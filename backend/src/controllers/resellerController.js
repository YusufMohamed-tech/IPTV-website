import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import SubscriptionPackage from "../models/Package.js";
import Sale from "../models/Sale.js";
import ActivityLog from "../models/ActivityLog.js";
import Notification from "../models/Notification.js";
import { logActivity } from "../services/activityService.js";
import { generateCsv, generatePdfBuffer } from "../utils/reportGenerator.js";

const ensureResellerOwnsClient = async (resellerId, clientId) =>
  User.findOne({ _id: clientId, role: "client", parentReseller: resellerId });

export const getDashboard = async (req, res, next) => {
  try {
    // Reseller dashboard metrics are scoped to the authenticated reseller only.
    const resellerId = req.user._id;

    const [totalClients, activeSubscriptions, salesData, recentClients, recentSubscriptions] = await Promise.all([
      User.countDocuments({ role: "client", parentReseller: resellerId, isActive: true }),
      Subscription.countDocuments({ resellerId, status: "active" }),
      Sale.aggregate([{ $match: { resellerId } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      User.find({ role: "client", parentReseller: resellerId }).sort({ createdAt: -1 }).limit(5).lean(),
      Subscription.find({ resellerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("clientId packageId", "fullName name")
        .lean()
    ]);

    res.json({
      metrics: {
        totalClients,
        activeSubscriptions,
        revenue: salesData[0]?.total || 0,
        remainingCredits: req.user.credits
      },
      recentClients,
      recentSubscriptions
    });
  } catch (error) {
    next(error);
  }
};

export const listClients = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const clients = await User.find({
      role: "client",
      parentReseller: req.user._id,
      ...(q
        ? {
            $or: [
              { fullName: { $regex: q, $options: "i" } },
              { email: { $regex: q, $options: "i" } }
            ]
          }
        : {})
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json(clients);
  } catch (error) {
    next(error);
  }
};

export const createClient = async (req, res, next) => {
  try {
    const { fullName, email, password, metadata } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const client = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: "client",
      parentReseller: req.user._id,
      metadata
    });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "reseller.client.create",
      targetType: "user",
      targetId: client._id
    });

    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const updates = {};
    ["fullName", "isActive", "metadata"].forEach((key) => {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    });

    const client = await User.findOneAndUpdate(
      { _id: clientId, role: "client", parentReseller: req.user._id },
      updates,
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "reseller.client.update",
      targetType: "user",
      targetId: client._id,
      details: updates
    });

    res.json(client);
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const client = await User.findOneAndDelete({ _id: clientId, role: "client", parentReseller: req.user._id });

    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    await Subscription.updateMany({ clientId: client._id }, { status: "cancelled" });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "reseller.client.delete",
      targetType: "user",
      targetId: client._id
    });

    res.json({ message: "Client deleted" });
  } catch (error) {
    next(error);
  }
};

export const listPackages = async (_req, res, next) => {
  try {
    const packs = await SubscriptionPackage.find({ isActive: true }).populate("serverIds").lean();
    res.json(packs);
  } catch (error) {
    next(error);
  }
};

export const assignSubscription = async (req, res, next) => {
  try {
    // Subscription assignment enforces reseller ownership and credit consumption.
    const { clientId, packageId, isTrial = false, serverId } = req.body;

    const client = await ensureResellerOwnsClient(req.user._id, clientId);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const pack = await SubscriptionPackage.findById(packageId);
    if (!pack) {
      return res.status(404).json({ message: "Package not found" });
    }

    const reseller = await User.findById(req.user._id);
    const requiredCredits = isTrial ? 0 : 1;

    if (reseller.credits < requiredCredits) {
      await Notification.create({
        userId: reseller._id,
        level: "critical",
        title: "Low credits",
        message: "Unable to assign subscription due to insufficient credits"
      });
      return res.status(400).json({ message: "Insufficient credits" });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (isTrial ? 3 : pack.durationDays));

    const subscription = await Subscription.create({
      clientId,
      resellerId: req.user._id,
      packageId,
      serverId,
      startDate,
      endDate,
      isTrial,
      status: isTrial ? "trial" : "active",
      priceCharged: isTrial ? 0 : pack.price
    });

    reseller.credits -= requiredCredits;
    await reseller.save();

    await Sale.create({
      resellerId: req.user._id,
      clientId,
      subscriptionId: subscription._id,
      amount: isTrial ? 0 : pack.price,
      type: isTrial ? "trial" : "new"
    });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "reseller.subscription.assign",
      targetType: "subscription",
      targetId: subscription._id,
      details: { isTrial, packageId }
    });

    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
};

export const renewSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await Subscription.findOne({ _id: subscriptionId, resellerId: req.user._id });

    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const pack = await SubscriptionPackage.findById(subscription.packageId);
    const reseller = await User.findById(req.user._id);

    if (reseller.credits < 1) {
      return res.status(400).json({ message: "Insufficient credits" });
    }

    const base = subscription.endDate > new Date() ? new Date(subscription.endDate) : new Date();
    base.setDate(base.getDate() + pack.durationDays);

    subscription.endDate = base;
    subscription.status = "active";
    subscription.isTrial = false;
    subscription.priceCharged = pack.price;
    await subscription.save();

    reseller.credits -= 1;
    await reseller.save();

    await Sale.create({
      resellerId: req.user._id,
      clientId: subscription.clientId,
      subscriptionId: subscription._id,
      amount: pack.price,
      type: "renewal"
    });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "reseller.subscription.renew",
      targetType: "subscription",
      targetId: subscription._id
    });

    res.json(subscription);
  } catch (error) {
    next(error);
  }
};

export const listSubscriptions = async (req, res, next) => {
  try {
    const status = req.query.status;
    const subs = await Subscription.find({
      resellerId: req.user._id,
      ...(status ? { status } : {})
    })
      .populate("clientId", "fullName email")
      .populate("packageId", "name durationDays price")
      .sort({ createdAt: -1 })
      .lean();

    res.json(subs);
  } catch (error) {
    next(error);
  }
};

export const getClientActivity = async (req, res, next) => {
  try {
    const clientIds = await User.find({ role: "client", parentReseller: req.user._id }).distinct("_id");
    const activity = await ActivityLog.find({
      $or: [{ actorId: { $in: clientIds } }, { targetId: { $in: clientIds } }]
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(activity);
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    // Reseller report exports mirror admin formats while enforcing tenant boundaries.
    const { reportType = "sales", format = "csv" } = req.query;
    let rows = [];

    if (reportType === "sales") {
      rows = await Sale.find({ resellerId: req.user._id }).sort({ createdAt: -1 }).lean();
      rows = rows.map((sale) => ({
        date: sale.createdAt,
        amount: sale.amount,
        type: sale.type
      }));
    } else {
      const clients = await User.find({ role: "client", parentReseller: req.user._id }).lean();
      rows = clients.map((client) => ({
        fullName: client.fullName,
        email: client.email,
        lastLoginAt: client.lastLoginAt,
        device: client.lastLoginDevice,
        createdAt: client.createdAt
      }));
    }

    if (format === "pdf") {
      const buffer = await generatePdfBuffer(`Reseller ${reportType} report`, rows);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${reportType}-report.pdf`);
      return res.send(buffer);
    }

    const csv = generateCsv(rows, Object.keys(rows[0] || { noData: "No data" }));
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${reportType}-report.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};
