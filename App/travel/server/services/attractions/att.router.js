// att.routes.js - נתיבים מתוקנים
import express from 'express';
import authenticateUser from '../middlewares/authenticateUser.js';
import {
  searchAttractionsByCity,
  bookAttraction,
  getDebugInfo,
  getPurchasedAttractions,
  removePurchasedAttraction
} from "./att.controller.js";

const router = express.Router();

// נתיב דיבוג (ללא אימות לבדיקה מהירה)
router.get('/debug', getDebugInfo);

// נתיבים עם אימות
router.post('/search-by-city', authenticateUser, searchAttractionsByCity);

// 🔥 תיקון נתיב ההזמנה
router.post('/book', authenticateUser, bookAttraction);

// 🔥 תיקון נתיב קבלת הרכישות - GET request
router.get('/purchased', authenticateUser, getPurchasedAttractions);

// 🔥 תיקון נתיב מחיקת רכישה - DELETE או POST
router.delete('/remove-purchase', authenticateUser, removePurchasedAttraction);
// אלטרנטיבה למקרה שאתה רוצה POST:
// router.post('/remove-purchase', authenticateUser, removePurchasedAttraction);

export default router;