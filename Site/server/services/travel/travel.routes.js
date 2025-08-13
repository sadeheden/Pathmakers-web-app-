import express from "express";
import {
  getCities,
  getCityByName,
  addCity,
  deleteCity,
  getHotels,
  addHotel,
  deleteHotel,
  getFlights,
  addFlight,
  deleteFlight,
  getAttractions,
  addAttraction,
  deleteAttraction
} from "./travel.controller.js"; 

const router = express.Router();

// Cities
router.get("/cities", getCities);
router.get("/cities/name/:name", getCityByName);
router.post("/cities", addCity);
router.delete("/cities/:id", deleteCity);

// Hotels
router.get("/hotels", getHotels);
router.post("/hotels", addHotel);
router.delete("/hotels/:id", deleteHotel);

// Flights
router.get("/flights", getFlights);
router.post("/flights", addFlight);
router.delete("/flights/:id", deleteFlight);

// Attractions
router.get("/attractions", getAttractions);
router.post("/attractions", addAttraction);
router.delete("/attractions/:id", deleteAttraction);

export default router;
