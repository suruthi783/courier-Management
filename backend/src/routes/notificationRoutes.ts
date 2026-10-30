import { Router } from 'express';
import { body } from 'express-validator';
import {
  getNotifications, markAsRead, markAllRead, createNotification,
} from '../controllers/notificationController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/notifications
router.get('/', getNotifications);

// PATCH /api/notifications/read-all  (must come before /:id)
router.patch('/read-all', markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', markAsRead);

// POST /api/notifications  (admin only — for system notifications)
router.post(
  '/',
  authorize('ADMIN'),
  validate([
    body('userId').notEmpty().withMessage('User ID required'),
    body('type').isIn(['STATUS_UPDATE','DELIVERY_ATTEMPT','OTP','SYSTEM','ASSIGNMENT']).withMessage('Invalid type'),
    body('title').trim().notEmpty().withMessage('Title required'),
    body('message').trim().notEmpty().withMessage('Message required'),
  ]),
  createNotification
);

export default router;
