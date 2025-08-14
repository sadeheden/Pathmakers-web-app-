// orders2.router.js
import express from 'express';
import Orders2Controller from './orders2.controller.js';
import authenticateUser from "../middleware/authenticateUser.js";

const router = express.Router();

// כל ה־routes דורשים authentication
router.use(authenticateUser);

// POST /api/orders2 — יצירת הזמנה חדשה
router.post('/', Orders2Controller.createOrder);

// GET /api/orders2 — שליפת כל הזמנות המשתמש
router.get('/', Orders2Controller.getUserOrders);

export default router;
