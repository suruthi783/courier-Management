import { Router } from 'express';
import { body } from 'express-validator';
import {
  getShipments, getShipmentById, trackShipment,
  createShipment, updateShipmentStatus, assignPartner, updateLocation,
} from '../controllers/shipmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.use(authenticate);

// GET /api/shipments/track/:trackingId  — public-ish, just needs auth
router.get('/track/:trackingId', trackShipment);

// GET /api/shipments
router.get('/', getShipments);

// GET /api/shipments/:id
router.get('/:id', getShipmentById);

// POST /api/shipments  (admin + branch staff + customer)
router.post(
  '/',
  authorize('ADMIN', 'BRANCH_STAFF', 'CUSTOMER'),
  validate([
    body('packageName').trim().notEmpty().withMessage('Package name required'),
    body('senderName').trim().notEmpty().withMessage('Sender name required'),
    body('senderAddress').trim().notEmpty().withMessage('Sender address required'),
    body('senderPhone').trim().notEmpty().withMessage('Sender phone required'),
    body('receiverName').trim().notEmpty().withMessage('Receiver name required'),
    body('receiverAddress').trim().notEmpty().withMessage('Receiver address required'),
    body('receiverPhone').trim().notEmpty().withMessage('Receiver phone required'),
    body('branchId').trim().notEmpty().withMessage('Branch ID required'),
    body('expectedDeliveryDate').isISO8601().withMessage('Valid expected delivery date required'),
  ]),
  createShipment
);

// PATCH /api/shipments/:id/status  (admin + branch staff)
router.patch(
  '/:id/status',
  authorize('ADMIN', 'BRANCH_STAFF'),
  validate([
    body('status')
      .isIn(['BOOKED','PICKED_UP','IN_TRANSIT','AT_BRANCH','OUT_FOR_DELIVERY','DELIVERED','FAILED_ATTEMPT'])
      .withMessage('Invalid status'),
  ]),
  updateShipmentStatus
);

// PATCH /api/shipments/:id/assign-partner  (admin + branch staff)
router.patch(
  '/:id/assign-partner',
  authorize('ADMIN', 'BRANCH_STAFF'),
  validate([body('partnerId').notEmpty().withMessage('Partner ID required')]),
  assignPartner
);

// PATCH /api/shipments/:id/location  (delivery partner)
router.patch(
  '/:id/location',
  authorize('DELIVERY_PARTNER'),
  validate([
    body('lat').isFloat({ min: -90,  max: 90  }).withMessage('Valid latitude required'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  ]),
  updateLocation
);

export default router;
