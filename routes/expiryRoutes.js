// routes/expiryRoutes.js

import express from 'express';
import { isAuthenticated } from '../middleware/authMiddleware.js';
import {
  getExpiringItems,
  createExpiryBill,
  getExpiryBills,
  getExpiryBillById
} from '../controllers/billController.js';

const router = express.Router();

// All routes require authentication
router.use(isAuthenticated);

// Get expiring items for a party within date range
router.get('/items', getExpiringItems);

// Create expiry bill and update inventory
router.post('/create', createExpiryBill);

// Get all expiry bills for the user
router.get('/', getExpiryBills);

// Get a specific expiry bill by ID
router.get('/:id', getExpiryBillById);

export default router;