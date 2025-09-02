// server/services/orders2/orders2.router.js
import express from "express";
import authenticateUser from "../middleware/authenticateUser.js";
import { createOrder, getUserOrders, hasDateConflict } from "./orders2.controller.js";

const router = express.Router();

// Check for conflicts
router.get("/conflicts", authenticateUser, hasDateConflict);

// Create + list orders
router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, getUserOrders);

// (Comment these out unless you've implemented them in the controller)
// import { resolveOrderRefs, getOrderReceiptPdf } from "./orders2.controller.js";
// router.post("/resolve", authenticateUser, resolveOrderRefs);
// router.get("/:id/receipt.pdf", authenticateUser, getOrderReceiptPdf);

export default router;
