// services/orders/order.router.js
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  createOrder,
  getOrdersForProfile,
  getDynamicData,
  checkAvailability,
  getAttractionsByCity,
} from './order.controller.js';

const router = express.Router();

// Simple healthcheck for this router (mounted at /api/orders)
router.get('/test', (req, res) => res.json({ message: 'Orders route is working!' }));

// Create order
router.post('/', authenticateUser, createOrder);

// List current user's orders (for Profile)
router.get('/', authenticateUser, getOrdersForProfile);

// Dynamic lookups (cities/flights/hotels)
router.post('/dynamic-data', authenticateUser, getDynamicData);

// Availability pre-check: GET /api/orders/availability?start=ISO&end=ISO
router.get('/availability', authenticateUser, checkAvailability);

// Attractions by city (frontend calls: /api/orders/attractions/city/:cityId)
router.get('/attractions/city/:cityId', authenticateUser, getAttractionsByCity);

export default router;
