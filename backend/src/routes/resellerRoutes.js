import { Router } from "express";
import { z } from "zod";
import {
  assignSubscription,
  createClient,
  deleteClient,
  exportReport,
  getClientActivity,
  getDashboard,
  listClients,
  listPackages,
  listSubscriptions,
  renewSubscription,
  updateClient
} from "../controllers/resellerController.js";
import { authorize, protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";

const router = Router();

const createClientSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    metadata: z.object({ phone: z.string().optional(), notes: z.string().optional() }).optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

const assignSubscriptionSchema = z.object({
  body: z.object({
    clientId: z.string().min(1),
    packageId: z.string().min(1),
    serverId: z.string().optional(),
    isTrial: z.boolean().optional()
  }),
  query: z.object({}).optional().default({}),
  params: z.object({}).optional().default({})
});

router.use(protect, authorize("reseller"));

router.get("/dashboard", getDashboard);
router.get("/clients", listClients);
router.post("/clients", validate(createClientSchema), createClient);
router.patch("/clients/:clientId", updateClient);
router.delete("/clients/:clientId", deleteClient);

router.get("/packages", listPackages);
router.get("/subscriptions", listSubscriptions);
router.post("/subscriptions", validate(assignSubscriptionSchema), assignSubscription);
router.post("/subscriptions/:subscriptionId/renew", renewSubscription);

router.get("/client-activity", getClientActivity);
router.get("/reports", exportReport);

export default router;
