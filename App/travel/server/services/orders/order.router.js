// routes/orders.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createOrder, getOrdersForProfile, getDynamicData } from '../controllers/orders.controller.js';

const router = Router();

router.post('/', requireAuth, createOrder);          // POST /api/orders
router.get('/profile', requireAuth, getOrdersForProfile);
router.post('/dynamic', requireAuth, getDynamicData);

export default router;
