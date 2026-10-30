import { Router } from 'express';
import { body } from 'express-validator';
import {
  getUsers, getUserById, createUser, updateUser,
  toggleUserActive, getDeliveryPartners,
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/users/delivery-partners  (branch staff + admin)
router.get('/delivery-partners', authorize('ADMIN', 'BRANCH_STAFF'), getDeliveryPartners);

// GET /api/users  (admin only)
router.get('/', authorize('ADMIN'), getUsers);

// GET /api/users/:id
router.get('/:id', authorize('ADMIN', 'BRANCH_STAFF'), getUserById);

// POST /api/users  (admin only)
router.post(
  '/',
  authorize('ADMIN'),
  validate([
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').notEmpty().withMessage('Phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['CUSTOMER', 'ADMIN', 'BRANCH_STAFF', 'DELIVERY_PARTNER']).withMessage('Invalid role'),
  ]),
  createUser
);

// PUT /api/users/:id  (admin only)
router.put('/:id', authorize('ADMIN'), updateUser);

// PATCH /api/users/:id/toggle-active  (admin only)
router.patch('/:id/toggle-active', authorize('ADMIN'), toggleUserActive);

export default router;
