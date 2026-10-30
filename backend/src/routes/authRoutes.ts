import { Router } from 'express';
import { body } from 'express-validator';
import { login, getMe, logout, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ]),
  login
);

// GET /api/auth/me
router.get('/me', authenticate, getMe);

// POST /api/auth/logout
router.post('/logout', authenticate, logout);

// POST /api/auth/change-password
router.post(
  '/change-password',
  authenticate,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  changePassword
);

export default router;
