import express from "express";
import { createOrder, getUserOrders } from "./order.controller.js";
import authenticateUser from '../middlewares/authenticateUser.js';
const router = express.Router();

// נתיב טסט פשוט לבדיקה שהרוטר פעיל
router.get('/test', (req, res) => {
  res.json({ message: 'Orders route is working!' });
});

router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, getUserOrders);

export default router;
