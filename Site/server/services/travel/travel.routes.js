import express from "express";
import * as controller from "./travel.controller.js"; // או לפי איך יצאת את הפונקציות

const router = express.Router();

// Cities
router.get("/cities", controller.getCities);
router.post("/cities", controller.addCity);
router.delete("/cities/:id", controller.deleteCity);

// Hotels
router.get("/hotels", controller.getHotels);
router.post("/hotels", controller.addHotel);
router.delete("/hotels/:id", controller.deleteHotel);

// Flights
router.get("/flights", controller.getFlights);
router.post("/flights", controller.addFlight);
router.delete("/flights/:id", controller.deleteFlight);

// Attractions
router.get("/attractions", controller.getAttractions);
router.post("/attractions", controller.addAttraction);
router.delete("/attractions/:id", controller.deleteAttraction);

export default router;
