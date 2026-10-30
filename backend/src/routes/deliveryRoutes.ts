import { Router } from 'express';
import { body } from 'express-validator';
import { verifyOtp, updateDelivery, getMyDeliveries } from '../controllers/deliveryController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/delivery/my-shipments
router.get('/my-shipments', authorize('DELIVERY_PARTNER'), getMyDeliveries);

// POST /api/delivery/verify-otp
router.post(
  '/verify-otp',
  authorize('DELIVERY_PARTNER'),
  validate([
    body('shipmentId').notEmpty().withMessage('Shipment ID required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required'),
  ]),
  verifyOtp
);

// POST /api/delivery/update
router.post(
  '/update',
  authorize('DELIVERY_PARTNER'),
  validate([
    body('shipmentId').notEmpty().withMessage('Shipment ID required'),
    body('status').isIn(['DELIVERED', 'FAILED_ATTEMPT']).withMessage('Status must be DELIVERED or FAILED_ATTEMPT'),
    body('otp').if(body('status').equals('DELIVERED'))
      .isLength({ min: 6, max: 6 }).isNumeric().withMessage('6-digit OTP required for delivery'),
    body('failedReason').if(body('status').equals('FAILED_ATTEMPT'))
      .isIn(['CUSTOMER_UNAVAILABLE','WRONG_ADDRESS','REFUSED','DAMAGED_PACKAGE','OTHER'])
      .withMessage('Valid failure reason required'),
  ]),
  updateDelivery
);

export default router;
