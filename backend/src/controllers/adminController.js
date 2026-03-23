import User from "../models/User.js";
import Sale from "../models/Sale.js";
import Subscription from "../models/Subscription.js";
import SubscriptionPackage from "../models/Package.js";
import Server from "../models/Server.js";
import ActivityLog from "../models/ActivityLog.js";
import Notification from "../models/Notification.js";
import { logActivity } from "../services/activityService.js";
import { generateCsv, generatePdfBuffer } from "../utils/reportGenerator.js";

const buildAdminAlerts = async () => {
  // Alert generation for low reseller credits and upcoming expirations.
  const lowCreditResellers = await User.find({ role: "reseller", credits: { $lt: 5 }, isActive: true })
    .select("fullName credits")
    .lean();

  for (const reseller of lowCreditResellers) {
    const exists = await Notification.findOne({
      title: "Low reseller credits",
      message: { $regex: reseller.fullName, $options: "i" },
      createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24) }
    });

    if (!exists) {
      await Notification.create({
        level: "warning",
        title: "Low reseller credits",
        message: `${reseller.fullName} is low on credits (${reseller.credits}).`
      });
    }
  }

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const expiring = await Subscription.find({
    status: "active",
    endDate: { $lte: nextWeek, $gte: new Date() }
  })
    .populate("clientId", "fullName")
    .limit(15)
    .lean();

  if (expiring.length > 0) {
    const exists = await Notification.findOne({
      title: "Expiring subscriptions",
      createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 12) }
    });

    if (!exists) {
      await Notification.create({
        level: "info",
        title: "Expiring subscriptions",
        message: `${expiring.length} subscriptions are expiring within 7 days.`
      });
    }
  }
};

export const getDashboard = async (_req, res, next) => {
  try {
    // Dashboard aggregates core KPIs and recent operations snapshots.
    await buildAdminAlerts();

    const [
      totalResellers,
      totalClients,
      activeSubscriptions,
      revenueData,
      recentSales,
      recentActivity,
      notifications
    ] = await Promise.all([
      User.countDocuments({ role: "reseller", isActive: true }),
      User.countDocuments({ role: "client", isActive: true }),
      Subscription.countDocuments({ status: "active" }),
      Sale.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      Sale.find().sort({ createdAt: -1 }).limit(5).populate("resellerId clientId", "fullName").lean(),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      Notification.find({ isRead: false }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    res.json({
      metrics: {
        totalResellers,
        totalClients,
        activeSubscriptions,
        revenue: revenueData[0]?.total || 0
      },
      recentSales,
      recentActivity,
      notifications
    });
  } catch (error) {
    next(error);
  }
};

export const listResellers = async (req, res, next) => {
  try {
    const q = req.query.q || "";
    const filter = {
      role: "reseller",
      ...(q ? { $or: [{ fullName: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] } : {})
    };

    const resellers = await User.find(filter).sort({ createdAt: -1 }).lean();
    res.json(resellers);
  } catch (error) {
    next(error);
  }
};

export const createReseller = async (req, res, next) => {
  try {
    const { fullName, email, password, credits = 0, metadata } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const reseller = await User.create({
      fullName,
      email: email.toLowerCase(),
      password,
      role: "reseller",
      credits,
      metadata
    });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.reseller.create",
      targetType: "user",
      targetId: reseller._id,
      details: { credits }
    });

    res.status(201).json(reseller);
  } catch (error) {
    next(error);
  }
};

export const updateReseller = async (req, res, next) => {
  try {
    const { resellerId } = req.params;
    const allowedUpdates = ["fullName", "isActive", "metadata"];
    const updatePayload = {};

    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updatePayload[key] = req.body[key];
      }
    }

    const reseller = await User.findOneAndUpdate(
      { _id: resellerId, role: "reseller" },
      updatePayload,
      { new: true }
    );

    if (!reseller) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.reseller.update",
      targetType: "user",
      targetId: reseller._id,
      details: updatePayload
    });

    res.json(reseller);
  } catch (error) {
    next(error);
  }
};

export const deleteReseller = async (req, res, next) => {
  try {
    const { resellerId } = req.params;
    const reseller = await User.findOneAndDelete({ _id: resellerId, role: "reseller" });

    if (!reseller) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    await User.updateMany({ parentReseller: reseller._id, role: "client" }, { isActive: false });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.reseller.delete",
      targetType: "user",
      targetId: reseller._id
    });

    res.json({ message: "Reseller deleted" });
  } catch (error) {
    next(error);
  }
};

export const assignCredits = async (req, res, next) => {
  try {
    const { resellerId } = req.params;
    const { credits } = req.body;

    const reseller = await User.findOne({ _id: resellerId, role: "reseller" });
    if (!reseller) {
      return res.status(404).json({ message: "Reseller not found" });
    }

    reseller.credits += credits;
    await reseller.save();

    await Notification.create({
      userId: reseller._id,
      level: "info",
      title: "Credits assigned",
      message: `Admin assigned ${credits} credits. Current balance: ${reseller.credits}`
    });

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.reseller.assignCredits",
      targetType: "user",
      targetId: reseller._id,
      details: { credits }
    });

    res.json({ message: "Credits assigned", reseller });
  } catch (error) {
    next(error);
  }
};

export const listPackages = async (_req, res, next) => {
  try {
    const packages = await SubscriptionPackage.find().populate("serverIds").sort({ createdAt: -1 }).lean();
    res.json(packages);
  } catch (error) {
    next(error);
  }
};

export const createPackage = async (req, res, next) => {
  try {
    const pack = await SubscriptionPackage.create(req.body);

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.package.create",
      targetType: "package",
      targetId: pack._id,
      details: { name: pack.name, price: pack.price }
    });

    res.status(201).json(pack);
  } catch (error) {
    next(error);
  }
};

export const updatePackage = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    const pack = await SubscriptionPackage.findByIdAndUpdate(packageId, req.body, { new: true });
    if (!pack) {
      return res.status(404).json({ message: "Package not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.package.update",
      targetType: "package",
      targetId: pack._id
    });

    res.json(pack);
  } catch (error) {
    next(error);
  }
};

export const deletePackage = async (req, res, next) => {
  try {
    const { packageId } = req.params;
    const pack = await SubscriptionPackage.findByIdAndDelete(packageId);
    if (!pack) {
      return res.status(404).json({ message: "Package not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.package.delete",
      targetType: "package",
      targetId: pack._id
    });

    res.json({ message: "Package deleted" });
  } catch (error) {
    next(error);
  }
};

export const listServers = async (_req, res, next) => {
  try {
    const servers = await Server.find().sort({ createdAt: -1 }).lean();
    res.json(servers);
  } catch (error) {
    next(error);
  }
};

export const createServer = async (req, res, next) => {
  try {
    const server = await Server.create(req.body);

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.server.create",
      targetType: "server",
      targetId: server._id,
      details: { name: server.name }
    });

    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
};

export const updateServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const server = await Server.findByIdAndUpdate(serverId, req.body, { new: true });
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.server.update",
      targetType: "server",
      targetId: server._id
    });

    res.json(server);
  } catch (error) {
    next(error);
  }
};

export const deleteServer = async (req, res, next) => {
  try {
    const { serverId } = req.params;
    const server = await Server.findByIdAndDelete(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }

    await logActivity({
      actorId: req.user._id,
      actorRole: req.user.role,
      action: "admin.server.delete",
      targetType: "server",
      targetId: server._id
    });

    res.json({ message: "Server deleted" });
  } catch (error) {
    next(error);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 100);
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).lean();
    res.json(logs);
  } catch (error) {
    next(error);
  }
};

export const getSales = async (req, res, next) => {
  try {
    const limit = Number(req.query.limit || 100);
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(limit).populate("resellerId clientId", "fullName email").lean();
    res.json(sales);
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (_req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    next(error);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    // Flexible export endpoint to support CSV/PDF from same data source.
    const { reportType = "sales", format = "csv" } = req.query;

    let rows = [];
    if (reportType === "sales") {
      rows = await Sale.find().populate("resellerId clientId", "fullName email").lean();
      rows = rows.map((sale) => ({
        date: sale.createdAt,
        type: sale.type,
        amount: sale.amount,
        reseller: sale.resellerId?.fullName,
        client: sale.clientId?.fullName
      }));
    } else {
      const clients = await User.find({ role: "client" }).populate("parentReseller", "fullName").lean();
      rows = clients.map((client) => ({
        fullName: client.fullName,
        email: client.email,
        reseller: client.parentReseller?.fullName || "N/A",
        lastLoginAt: client.lastLoginAt,
        device: client.lastLoginDevice,
        createdAt: client.createdAt
      }));
    }

    if (format === "pdf") {
      const buffer = await generatePdfBuffer(`Admin ${reportType} report`, rows);
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
