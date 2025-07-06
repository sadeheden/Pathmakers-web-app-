import express from "express";
import { createOrder, getUserOrders, getOrderPDF } from "./order.controller.js";
import authenticateUser from "./middleware/authenticateUser.js";

const router = express.Router();

router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, getUserOrders);
router.get("/:orderId/pdf", authenticateUser, getOrderPDF);

export default router;