// src/orders2/order2.routes.js
import express from "express";
import authenticateUser from "../middleware/authenticateUser.js";
import { createOrder, getUserOrders, resolveOrderRefs, getOrderReceiptPdf, hasDateConflict } from "./order.controller.js";

const router = express.Router();

router.get("/conflicts", authenticateUser, hasDateConflict); // ✅ add this first

router.post("/", authenticateUser, createOrder);
router.get("/:id/receipt.pdf", authenticateUser, getOrderReceiptPdf);
router.get("/", authenticateUser, getUserOrders);
router.post("/resolve", authenticateUser, resolveOrderRefs);

export default router;
