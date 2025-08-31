// services/orders/order.router.js
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  createOrder,
  getOrdersForProfile,
  getDynamicData,
  getAttractionsByCity  // Add this import
} from './order.controller.js';

const router = express.Router();

router.get('/test', (req, res) => res.json({ message: 'Orders route is working!' }));

router.post('/', authenticateUser, createOrder);
router.post('/api/orders', authenticateUser, createOrder);
router.get('/', authenticateUser, getOrdersForProfile);
router.post('/dynamic-data', authenticateUser, getDynamicData);

// Add the new attractions endpoint
router.get('/attractions/city/:cityId', authenticateUser, getAttractionsByCity);

export default router;