import ActivityLog from "../models/ActivityLog.js";

export const logActivity = async ({ actorId, actorRole, action, targetType, targetId, details }) => {
  await ActivityLog.create({
    actorId,
    actorRole,
    action,
    targetType,
    targetId,
    details
  });
};
