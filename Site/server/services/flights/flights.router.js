// flights.routes.js
import { Router } from "express";
import {
  getFlights,
  getFlightById,
  addFlight,
  updateFlight,
  deleteFlight,
  getFlightsByCityName,
} from "./flights.controller.js";

const router = Router();

router
  .get("/city/:city", getFlightsByCityName) // חייב להיות לפני '/:id' כדי למנוע קונפליקטים
  .get("/:id", getFlightById)
  .get("/", getFlights)
  .post("/", addFlight)
  .put("/:id", updateFlight)
  .delete("/:id", deleteFlight);

export default router;
