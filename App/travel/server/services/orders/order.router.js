import express from 'express';
import { createOrder, getUserOrders, getDynamicData,getOrdersForProfile  } from './order.controller.js'; // ⬅ add getDynamicData
import authenticateUser from '../middlewares/authenticateUser.js';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Orders route is working!' });
});

router.post('/', authenticateUser, createOrder);
router.get('/', authenticateUser, getUserOrders);
router.get('/profile', authenticateUser, getOrdersForProfile);
// ⬇️ NEW: dynamic resolver used by your Profile screen
router.post('/dynamic-data', authenticateUser, getDynamicData);

export default router;
