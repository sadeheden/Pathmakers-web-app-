// services/orders/order.router.js
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  createOrder,              // ✅ import this
  getOrdersForProfile,
  getDynamicData
} from './order.controller.js';

const router = express.Router();

router.get('/test', (req, res) => res.json({ message: 'Orders route is working!' }));

router.post('/', authenticateUser, createOrder);   // ✅ add this line
router.post('/api/orders', authenticateUser, createOrder);
router.get('/', authenticateUser, getOrdersForProfile);
router.post('/dynamic-data', authenticateUser, getDynamicData);

export default router;