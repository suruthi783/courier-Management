import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// GET /api/audit-logs  (admin only)
router.get('/', authenticate, authorize('ADMIN'), getAuditLogs);

export default router;
