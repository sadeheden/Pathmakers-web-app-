import express from 'express';
import { createOrder, getUserOrders,getDynamicData  } from './order.controller.js';
import authenticateUser from '../middlewares/authenticateUser.js';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Orders route is working!' });
});

router.post('/', authenticateUser, createOrder);
router.get('/', authenticateUser, getUserOrders); 
router.post('/dynamic-data', authMiddleware, getDynamicData);

export default router;
