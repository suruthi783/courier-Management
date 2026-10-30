import { Router } from 'express';
import {
  getDashboardStats, getDeliveryTrends, getStatusBreakdown,
  getBranchRevenue, getTopPartners, getLivePartners,
} from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', getDashboardStats);

// GET /api/dashboard/trends
router.get('/trends', getDeliveryTrends);

// GET /api/dashboard/status-breakdown
router.get('/status-breakdown', getStatusBreakdown);

// GET /api/dashboard/branch-revenue  (admin only)
router.get('/branch-revenue', authorize('ADMIN'), getBranchRevenue);

// GET /api/dashboard/top-partners  (admin only)
router.get('/top-partners', authorize('ADMIN'), getTopPartners);

// GET /api/dashboard/live-partners
router.get('/live-partners', authorize('ADMIN', 'BRANCH_STAFF'), getLivePartners);

export default router;
