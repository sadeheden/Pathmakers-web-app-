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

/**
 * 🏙 Cities Routes
 * אם ה־app.use('/api/travel/cities', router)
 * אז כאן נשאיר נתיבים יחסיים בלבד.
 */
router.get("/", getCities);                  // GET /api/travel/cities
router.get("/name/:name", getCityByName);    // GET /api/travel/cities/name/:name
router.post("/", addCity);
router.delete("/:id", deleteCity);           // DELETE /api/travel/cities/:id

/**
 * 🏨 Hotels Routes
 * אם ה־app.use('/api/travel/hotels', router)
 */
router.get("/", getHotels);                  // GET /api/travel/hotels
router.post("/", addHotel);                  // POST /api/travel/hotels
router.delete("/:id", deleteHotel);          // DELETE /api/travel/hotels/:id
router.post("/add-hotels", addHotelsToCity); // POST /api/travel/hotels/add-hotels

/**
 * ✈ Flights Routes
 * אם ה־app.use('/api/travel/flights', router)
 */
router.get("/", getFlights);                     // GET /api/travel/flights
router.post("/", addFlight);                     // POST /api/travel/flights
router.delete("/:id", deleteFlight);             // DELETE /api/travel/flights/:id
router.post("/add-flights", addFlightsToCity);   // POST /api/travel/flights/add-flights

/**
 * 🎢 Attractions Routes
 * אם ה־app.use('/api/travel/attractions', router)
 */
router.get("/", getAttractions);                     // GET /api/travel/attractions
router.post("/", addAttraction);                     // POST /api/travel/attractions
router.delete("/:id", deleteAttraction);             // DELETE /api/travel/attractions/:id
router.post("/add-attractions", addAttractionsToCity); // POST /api/travel/attractions/add-attractions

export default router;
