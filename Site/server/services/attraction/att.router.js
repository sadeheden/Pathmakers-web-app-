import express from "express";
import { getAttractions } from "./att.controller.js"; // Use the controller

const router = express.Router();

router.get("/:city", getAttractions); // Add city parameter

export default router;
