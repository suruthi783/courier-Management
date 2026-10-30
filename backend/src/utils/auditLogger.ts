import { v4 as uuidv4 } from 'uuid';
import { execute } from '../config/database.js';

interface AuditEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: string;
  ipAddress?: string;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    execute(
      `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, ip_address, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [uuidv4(), entry.userId, entry.action, entry.resource, entry.resourceId, entry.details, entry.ipAddress ?? null]
    );
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}
