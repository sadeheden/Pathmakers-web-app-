import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  searchAttractionsByCity,
  bookAttraction,
  getDebugInfo
} from './att.controller.js';

const router = express.Router();

// נתיב דיבוג (ללא אימות לבדיקה מהירה)
router.get('/debug', getDebugInfo);

// נתיבים עם אימות
router.post('/search-by-city', authenticateUser, searchAttractionsByCity);
router.post('/:id/book', authenticateUser, bookAttraction);

export default router;