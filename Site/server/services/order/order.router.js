import express from "express";
import { createOrder, getUserOrders,resolveOrderRefs } from "./order.controller.js";
import authenticateUser from "../middleware/authenticateUser.js";

const router = express.Router();

router.post("/", authenticateUser, createOrder);
router.get("/", authenticateUser, getUserOrders);
router.post("/resolve", authenticateUser, resolveOrderRefs);

export default router;
