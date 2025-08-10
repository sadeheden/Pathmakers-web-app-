// order.router.js
import express from 'express';
import { getUserOrders, getDynamicData } from './order.controller.js';
import authenticateUser from '../middlewares/authenticateUser.js';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Orders route is working!' });
});

router.get('/', authenticateUser, getUserOrders);
router.post('/dynamic-data', authenticateUser, getDynamicData);

export default router;
