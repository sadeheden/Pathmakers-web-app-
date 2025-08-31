// orderCancellation.routes.js - Enhanced with debugging
import express from 'express';
import { 
  cancelOrder, 
  getCancelledOrders, 
  checkCancellationEligibility 
} from './orderCancellation.controller.js';

// Middleware לאימות JWT
import authenticateToken from "../middleware/authenticateUser.js";

const router = express.Router();

// Debug middleware to log all requests to this router
router.use((req, res, next) => {
  console.log(`🔍 Order cancellation route: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Params:`, req.params);
  console.log(`🔍 User:`, req.user?.id || req.user?._id);
  next();
});

/**
 * @route PATCH /:orderId/cancel
 * @desc Cancel a specific order
 * @access Private
 */
router.patch('/:orderId/cancel', authenticateToken, (req, res, next) => {
  console.log(`🎯 Hit cancel route for orderId: ${req.params.orderId}`);
  next();
}, cancelOrder);

/**
 * @route GET /:orderId/can-cancel
 * @desc Check if an order can be cancelled
 * @access Private
 */
router.get('/:orderId/can-cancel', authenticateToken, (req, res, next) => {
  console.log(`🎯 Hit can-cancel route for orderId: ${req.params.orderId}`);
  next();
}, checkCancellationEligibility);

/**
 * @route GET /cancelled
 * @desc Get all cancelled orders for the authenticated user
 * @access Private
 */
router.get('/cancelled', authenticateToken, (req, res, next) => {
  console.log(`🎯 Hit cancelled orders route`);
  next();
}, getCancelledOrders);

// Test route to verify router is working
router.get('/test-cancel-routes', (req, res) => {
  res.json({ 
    success: true, 
    message: "Order cancellation routes are working!",
    timestamp: new Date().toISOString()
  });
});

export default router;