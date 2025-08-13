import express from 'express';
import {
  getAllSupportRequests,
  createSupportRequest,
  updateSupportStatus
} from './support.controller.js';

const router = express.Router();

router.get('/', getAllSupportRequests); // קבלת כל הפניות
router.post('/', createSupportRequest); // יצירת פנייה חדשה
router.patch('/:id', updateSupportStatus); // עדכון סטטוס

export default router;
