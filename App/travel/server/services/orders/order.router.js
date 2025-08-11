// services/orders/order.router.js
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  getOrdersForProfile,
  getDynamicData
} from './order.controller.js';

const router = express.Router();

// נתיב לבדיקה פשוטה
router.get('/test', (req, res) => res.json({ message: 'Orders route is working!' }));

// נתיבי הזמנות - Get orders for profile
router.get('/', authenticateUser, getOrdersForProfile);

// נתיב לקבלת מידע דינמי (למשל: ערים, טיסות, מלונות לפי מזהים)
router.post('/dynamic-data', authenticateUser, getDynamicData);


export default router;
