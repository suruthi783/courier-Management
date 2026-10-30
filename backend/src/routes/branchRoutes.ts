import { Router } from 'express';
import { body } from 'express-validator';
import {
  getBranches, getBranchById, createBranch,
  updateBranch, toggleBranchActive, deleteBranch,
} from '../controllers/branchController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/branches
router.get('/', getBranches);

// GET /api/branches/:id
router.get('/:id', getBranchById);

// POST /api/branches  (admin only)
router.post(
  '/',
  authorize('ADMIN'),
  validate([
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('code').trim().isLength({ min: 2 }).withMessage('Code is required'),
    body('address').trim().isLength({ min: 5 }).withMessage('Address is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ]),
  createBranch
);

// PUT /api/branches/:id  (admin only)
router.put('/:id', authorize('ADMIN'), updateBranch);

// PATCH /api/branches/:id/toggle-active  (admin only)
router.patch('/:id/toggle-active', authorize('ADMIN'), toggleBranchActive);

// DELETE /api/branches/:id  (admin only)
router.delete('/:id', authorize('ADMIN'), deleteBranch);

export default router;
