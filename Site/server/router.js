import { Router } from 'express';
import authRouter from '../services/auth/auth.router.js';
import uploadRouter from '../services/upload/upload.router.js';
import citiesRouter from '../services/cities/cities.router.js';

const router = Router();

// בדיקת חיבור
router.get('/', (req, res) => {
  res.json({ message: '✅ API is working!' });
});

// רישום ראוטים
router.use('/auth', authRouter);
router.use('/upload', uploadRouter);
router.use('/cities', citiesRouter);

export default router;