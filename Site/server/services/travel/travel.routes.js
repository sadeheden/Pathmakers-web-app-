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
  addFlightsToCity,
  getAttractions,
  addAttraction,
  addHotelsToCity,
  deleteAttraction,
  addAttractionsToCity
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
router.post("/add-hotels", addHotelsToCity);

// Flights
router.get("/flights", getFlights);
router.post("/flights", addFlight);
router.delete("/flights/:id", deleteFlight);
router.post("/add-flights", addFlightsToCity);
// Attractions
router.get("/attractions", getAttractions);
router.post("/attractions", addAttraction);
router.delete("/attractions/:id", deleteAttraction);
router.post("/add-attractions", addAttractionsToCity);

export default router;
