// services/orders/order.router.js - עם routes לדיבוג
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import { checkDBHealth } from '../auth/auth.db.js';
import {
  createOrder,
  getOrdersForProfile,
  getDynamicData
} from './order.controller.js';

const router = express.Router();

// Basic test route
router.get('/test', (req, res) => {
  console.log('🧪 Test route accessed');
  res.json({ 
    message: 'Orders route is working!', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// Database health check route
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested');
    const health = await checkDBHealth();
    console.log('🏥 Health check result:', health);
    res.json(health);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({ healthy: false, message: error.message });
  }
});

// Authentication test route
router.get('/auth-test', authenticateUser, (req, res) => {
  console.log('🔐 Auth test - User from middleware:', req.user);
  res.json({ 
    message: 'Authentication is working!', 
    user: req.user,
    userId: req.user?.id || req.user?.userId || req.user?._id
  });
});

// Main routes
router.post('/', authenticateUser, createOrder);
router.get('/', authenticateUser, getOrdersForProfile);
router.post('/dynamic-data', authenticateUser, getDynamicData);

export default router;