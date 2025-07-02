import { Router } from "express";
import {
  getFlights,
  getFlightById,
  addFlight,
  updateFlight,
  deleteFlight,
  getFlightsByCityName
} from "./flights.controller.js";

const router = Router();

router
  .get("/city/:city", getFlightsByCityName)  // Must be BEFORE '/:id' to avoid conflicts
  .get("/:id", getFlightById)
  .get("/", getFlights)
  .post("/", addFlight)
  .put("/:id", updateFlight)
  .delete("/:id", deleteFlight);

export default router;
