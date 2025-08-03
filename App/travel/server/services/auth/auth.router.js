import express from 'express';
import { loginUser } from './auth.controller.js';
import authenticateUser from '../middlewares/authenticateUser.js';

const router = express.Router();

// Public route
router.post('/login', loginUser);

// Protected route example
router.get('/profile', authenticateUser, (req, res) => {
  res.json({ message: 'Welcome back!', user: req.user });
});

export default router;
