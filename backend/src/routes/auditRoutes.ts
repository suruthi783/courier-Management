import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/audit-logs  (admin only)
router.get('/', authenticate, authorize('ADMIN'), getAuditLogs);

export default router;
