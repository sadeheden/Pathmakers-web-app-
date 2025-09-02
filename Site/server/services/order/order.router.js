// order.router.js
import express from "express";
import {
  createOrder,
  getUserOrders,
  resolveOrderRefs,
  getOrderReceiptPdf,
  hasDateConflict,        // ✅ ADD THIS IMPORT
} from "./order.controller.js";
import authenticateUser from "../middleware/authenticateUser.js";

const router = express.Router();

/**
 * Order of routes:
 * - Exact paths first
 * - No generic `/:id` catch-all here, so we're safe.
 */

// ✅ Conflicts endpoint used by your frontend preflight
router.get("/conflicts", authenticateUser, hasDateConflict);

// Create & list
router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, getUserOrders);

// Resolve refs before create
router.post("/resolve", authenticateUser, resolveOrderRefs);

// Receipt
router.get("/:id/receipt.pdf", authenticateUser, getOrderReceiptPdf);

export default router;
