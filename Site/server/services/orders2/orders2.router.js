// services/orders2/orders2.router.js
import express from 'express';
import {
  createOrder,
  getUserOrders,
  resolveOrderRefs,
  getOrderReceiptPdf,
  hasDateConflict,
} from "./orders2.controller.js";
import authenticateUser from '../middleware/authenticateUser.js';

const router = express.Router();

router.use(authenticateUser);                          // 🔒 protect all routes
router.get("/conflicts", authenticateUser, hasDateConflict);
router.post("/", authenticateUser, createOrder);
router.get("/:id/receipt.pdf", authenticateUser, getOrderReceiptPdf);
router.get("/", authenticateUser, getUserOrders);
router.post("/resolve", authenticateUser, resolveOrderRefs);

export default router;