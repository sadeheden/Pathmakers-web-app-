// services/orders/order.router.js
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import { getOrdersForProfile, getDynamicData } from './order.controller.js';

const router = express.Router();

// Orders for Profile.jsx
router.get('/', authenticateUser, getOrdersForProfile);

// Fallback dynamic lookup (cities→city, flights, hotels)
router.post('/dynamic-data', authenticateUser, getDynamicData);

export default router;
