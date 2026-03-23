import { Router } from "express";
import { z } from "zod";
import {
  assignCredits,
  createPackage,
  createReseller,
  createServer,
  deletePackage,
  deleteReseller,
  deleteServer,
  exportReport,
  getActivity,
  getDashboard,
  getNotifications,
  getSales,
  listPackages,
  listResellers,
  listServers,
  markNotificationRead,
  updatePackage,
  updateReseller,
  updateServer
} from "../controllers/adminController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

const createResellerSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    credits: z.number().min(0).optional(),
    metadata: z.object({ phone: z.string().optional(), notes: z.string().optional() }).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const assignCreditsSchema = z.object({
  body: z.object({ credits: z.number().min(1) }),
  query: z.object({}).optional().default({}),
  params: z.object({ resellerId: z.string().min(1) })
});

const packageSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    durationDays: z.number().min(1),
    price: z.number().min(0),
    channelLists: z
      .array(
        z.object({
          name: z.string().min(1),
          channels: z.array(z.string()).optional(),
          url: z.string().optional()
        })
      )
      .optional(),
    serverIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const serverSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    xtreamUrl: z.string().optional(),
    m3uUrl: z.string().optional(),
    status: z.enum(["online", "offline", "maintenance"]).optional(),
    notes: z.string().optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

router.use(protect, authorize("admin"));

router.get("/dashboard", getDashboard);
router.get("/resellers", listResellers);
router.post("/resellers", validate(createResellerSchema), createReseller);
router.patch("/resellers/:resellerId", updateReseller);
router.delete("/resellers/:resellerId", deleteReseller);
router.post("/resellers/:resellerId/credits", validate(assignCreditsSchema), assignCredits);

router.get("/packages", listPackages);
router.post("/packages", validate(packageSchema), createPackage);
router.patch("/packages/:packageId", updatePackage);
router.delete("/packages/:packageId", deletePackage);

router.get("/servers", listServers);
router.post("/servers", validate(serverSchema), createServer);
router.patch("/servers/:serverId", updateServer);
router.delete("/servers/:serverId", deleteServer);

router.get("/activity", getActivity);
router.get("/sales", getSales);
router.get("/notifications", getNotifications);
router.patch("/notifications/:notificationId/read", markNotificationRead);
router.get("/reports", exportReport);

export default router;
