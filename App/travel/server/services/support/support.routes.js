// support.routes.js 
import express from "express"; 
import { addSupportMessage, getSupportMessages, updateSupportMessageStatus } from "./support.controller.js"; 
 
const router = express.Router(); 

// 👈 הוספתי middleware לוגים
router.use((req, res, next) => {
  console.log(`📍 Support Route: ${req.method} ${req.originalUrl}`);
  console.log('📦 Request Body:', req.body);
  next();
});

// שליחת הודעה חדשה 
router.post("/", addSupportMessage); 
 
// קבלת רשימת ההודעות (למנהל) 
router.get("/", getSupportMessages); 

// עדכון סטטוס הודעה (למנהל)
router.patch("/:id/status", updateSupportMessageStatus);

// 👈 הוספתי test route
router.get("/test", (req, res) => {
  console.log('🧪 Support test route called');
  res.json({
    message: "Support API is working!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

export default router;