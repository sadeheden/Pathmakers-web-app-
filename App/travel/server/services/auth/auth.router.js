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
router.get('/test-mongo', async (req, res) => {
  try {
    const users = await getUserCollection();
    const data = await users.find({}).limit(5).toArray(); // fetch 5 users
    res.json({ success: true, data });
  } catch (error) {
    console.error('MongoDB test error:', error);
    res.status(500).json({ success: false, message: 'MongoDB connection failed' });
  }
});
export default router;
