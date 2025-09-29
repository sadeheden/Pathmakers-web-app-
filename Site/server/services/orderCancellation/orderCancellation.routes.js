import express from 'express';
import { 
  cancelOrder, 
  getCancelledOrders, 
  checkCancellationEligibility 
} from './orderCancellation.controller.js';

import authenticateToken from "../middleware/authenticateUser.js";

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔍 Order cancellation route: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Query:`, req.query);
  console.log(`🔍 Params:`, req.params);
  next();
});

// Cancel route using query parameter (avoids route conflicts)
router.post('/cancel', authenticateToken, (req, res, next) => {
  const orderId = req.query.id || req.body.orderId;
  console.log(`🎯 Cancel route hit for order: ${orderId}`);
  req.params.orderId = orderId; // Map to params for controller
  next();
}, cancelOrder);

router.patch('/cancel', authenticateToken, (req, res, next) => {
  const orderId = req.query.id || req.body.orderId;
  req.params.orderId = orderId;
  next();
}, cancelOrder);

// Other routes
router.get('/cancelled', authenticateToken, getCancelledOrders);

// Test route
router.get('/test-cancel-routes', (req, res) => {
  res.json({ 
    success: true, 
    message: "Order cancellation routes are working!",
    timestamp: new Date().toISOString()
  });
});

export default router;