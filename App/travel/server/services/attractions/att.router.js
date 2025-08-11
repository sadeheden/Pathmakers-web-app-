import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  searchAttractionsByCity,
  bookAttraction
} from './att.controller.js';

const router = express.Router();

// חיפוש אטרקציות לפי עיר
router.post('/search-by-city', authenticateUser, searchAttractionsByCity);

// הזמנת אטרקציה
router.post('/:id/book', authenticateUser, bookAttraction);

export default router;
