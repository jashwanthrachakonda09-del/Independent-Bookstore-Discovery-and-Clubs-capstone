import { AuditLog } from "../models/audit-log.model.js";

/**
 * Record an audit log event for auditable tracking of inventory and privileged actions.
 */
export async function recordAuditEvent({
  actingUserId,
  action,
  entity,
  entityId,
  storeId = null,
  details = {},
  ipAddress = "",
}) {
  try {
    const auditRecord = await AuditLog.create({
      actingUserId,
      action,
      entity,
      entityId: String(entityId),
      storeId,
      details,
      ipAddress,
    });
    return auditRecord;
  } catch (error) {
    console.error("[Audit Error] Failed to write audit event:", error.message);
    return null;
  }
}
