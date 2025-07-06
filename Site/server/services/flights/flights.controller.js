import { ObjectId } from "mongodb";
import Flight from "./flights.model.js";
import { getFlightsByCity } from "./flights.db.js";

// Get all flights
export async function getFlights(req, res) {
  try {
    const flights = await Flight.findAll();
    return res.status(200).json(flights);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching flights." });
  }
}

// Get flight by ID
export async function getFlightById(req, res) {
  const { id } = req.params;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid or missing Flight ID." });
  }

  try {
    const flight = await Flight.findById(id);
    if (!flight) {
      return res.status(404).json({ error: "Flight not found." });
    }
    return res.status(200).json(flight);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while fetching the flight." });
  }
}

// Add a flight
export async function addFlight(req, res) {
  const { city, airline, departureTime } = req.body;

  if (!city || !airline || !departureTime) {
    return res.status(400).json({ error: "City, airline, and departure time are required." });
  }

  const newFlight = new Flight({ city, airline, departureTime });

  try {
    const result = await newFlight.save();
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while adding the flight." });
  }
}

// Update flight
export async function updateFlight(req, res) {
  const { id } = req.params;
  const { city, airline, departureTime } = req.body;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid or missing Flight ID." });
  }

  if (!city || !airline || !departureTime) {
    return res.status(400).json({ error: "City, airline, and departure time are required." });
  }

  const updatedFlight = new Flight({ city, airline, departureTime });

  try {
    const result = await updatedFlight.update(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while updating the flight." });
  }
}

// Delete flight
export async function deleteFlight(req, res) {
  const { id } = req.params;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid or missing Flight ID." });
  }

  try {
    const result = await Flight.delete(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "An error occurred while deleting the flight." });
  }
}

// New: Get flights by city name (case insensitive)
export async function getFlightsByCityName(req, res) {
  const city = req.params.city?.trim().toLowerCase();

  if (!city) {
    return res.status(400).json({ error: "City name is required." });
  }

  try {
    const flights = await getFlightsByCity(city);
    if (!flights.length) {
      return res.status(404).json({ error: `No flights found for city: ${city}` });
    }
    return res.status(200).json(flights);
  } catch (error) {
    console.error("Error fetching flights by city:", error);  // **הדפסת השגיאה בפירוט**
    return res.status(500).json({ error: "Server error" });
  }
}
