import express from 'express';
// Create a simple auth middleware to fix the missing file issue
const authenticateUser = (req, res, next) => {
  // For now, let's create a mock user - replace this with your actual auth logic
  req.user = {
    id: '507f1f77bcf86cd799439011', // Mock user ID
    userId: '507f1f77bcf86cd799439011'
  };
  next();
};

import {
  getUserOrders,
  getDynamicData,
  searchAttractions,        // Original location-based search
  searchAttractionsByCity,  // NEW: City-based search
  bookAttraction
} from './order.controller.js';

const router = express.Router();

router.get('/test', (req, res) => res.json({ message: 'Orders route is working!' }));

// -------------------- Orders routes (PRESERVED) --------------------
router.get('/', authenticateUser, getUserOrders);
router.post('/dynamic', authenticateUser, getDynamicData);

// -------------------- Attractions routes --------------------
// Original location-based search (PRESERVED)
router.post('/search', authenticateUser, searchAttractions);      // POST /api/orders/search

// NEW: City-based search  
router.post('/search-by-city', authenticateUser, searchAttractionsByCity); // POST /api/orders/search-by-city

// Booking endpoint (works with both search methods)
router.post('/:id/book', authenticateUser, bookAttraction);       // POST /api/orders/:id/book

export default router;