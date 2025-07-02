import express from "express";
import { getFlights } from "./flights.controller.js";

const router = express.Router();

router.get("/:city", getFlights);

export default router;
