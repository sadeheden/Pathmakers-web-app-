import express from "express";
import { getHotels } from "./hotel.controller.js"; // ✅ Ensure controller exists

const router = express.Router();

router.get("/:city", getHotels); // ✅ Must match frontend request

export default router;
