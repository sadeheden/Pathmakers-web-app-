// server/auth/auth.router.js

import express from 'express';
import { loginUser, registerUser } from './auth.controller.js';
import authenticateUser from '../middlewares/authenticateUser.js';

const router = express.Router();

// Public routes
router.post('/login', loginUser);
router.post('/register', registerUser); // Optional

// Protected example route
router.get('/profile', authenticateUser, (req, res) => {
  res.json({ message: 'Welcome back!', user: req.user });
});

export default router;
