// flights.controller.js
import { ObjectId } from "mongodb";
import Flight from "./flights.model.js";
import { getFlightsByCity } from "./flights.db.js";

// מחזיר את כל הטיסות כמערך שטוח לפי הפורמט המבוקש
export async function getFlights(req, res) {
  try {
    const flightsDocs = await Flight.findAll();

    const flatFlights = flightsDocs.flatMap((doc) =>
      (doc.airlines || []).map((airline, idx) => ({
        id: `${doc._id}_${idx}`,
        airline: airline.name,
        departureTime: airline.departureTime,
        price: airline.price,
        city: doc.city,
      }))
    );

    return res.status(200).json(flatFlights);
  } catch (error) {
    console.error("Error in getFlights:", error);
    return res.status(500).json({ error: "An error occurred while fetching flights." });
  }
}

// מחזיר טיסה יחידה לפי id מורכב
export async function getFlightById(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing Flight ID." });
  }

  try {
    const [docId, idxStr] = id.split("_");
    if (!ObjectId.isValid(docId)) {
      return res.status(400).json({ error: "Invalid Flight ID format." });
    }
    const idx = parseInt(idxStr);
    if (isNaN(idx)) {
      return res.status(400).json({ error: "Invalid Flight index." });
    }

    const flightDoc = await Flight.findById(docId);
    if (!flightDoc) {
      return res.status(404).json({ error: "Flight not found." });
    }

    const airline = (flightDoc.airlines || [])[idx];
    if (!airline) {
      return res.status(404).json({ error: "Flight not found at given index." });
    }

    const flight = {
      id,
      airline: airline.name,
      departureTime: airline.departureTime,
      price: airline.price,
      city: flightDoc.city,
    };

    return res.status(200).json(flight);
  } catch (error) {
    console.error("Error in getFlightById:", error);
    return res.status(500).json({ error: "An error occurred while fetching the flight." });
  }
}

// מוסיף טיסה חדשה למסמך עיר קיים או יוצר מסמך חדש
export async function addFlight(req, res) {
  const { city, airline, departureTime, price } = req.body;

  if (!city || !airline || !departureTime || price == null) {
    return res.status(400).json({ error: "City, airline, departureTime and price are required." });
  }

  try {
    const cityDocs = await Flight.findByCityExact(city);
    let cityDoc;
    if (cityDocs.length === 0) {
      cityDoc = await Flight.createCityWithFlight({ city, airline, departureTime, price });
    } else {
      cityDoc = cityDocs[0];
      await Flight.addFlightToCity(cityDoc._id, { name: airline, departureTime, price });
    }

    return res.status(201).json({ message: "Flight added successfully", cityDoc });
  } catch (error) {
    console.error("Error adding flight:", error);
    return res.status(500).json({ error: "An error occurred while adding the flight." });
  }
}

// עדכון מסמך עיר (לא טיסה בודדת)
export async function updateFlight(req, res) {
  const { id } = req.params;
  const { city, airline, departureTime, price } = req.body;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid or missing Flight ID." });
  }

  if (!city || !airline || !departureTime || price == null) {
    return res.status(400).json({ error: "City, airline, departureTime and price are required." });
  }

  try {
    const result = await Flight.updateCityDocument(id, { city, airline, departureTime, price });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating flight:", error);
    return res.status(500).json({ error: "An error occurred while updating the flight." });
  }
}

// מחיקת מסמך עיר
export async function deleteFlight(req, res) {
  const { id } = req.params;

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid or missing Flight ID." });
  }

  try {
    const result = await Flight.delete(id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error deleting flight:", error);
    return res.status(500).json({ error: "An error occurred while deleting the flight." });
  }
}

// מחזיר את כל הטיסות של עיר ספציפית בפורמט שטוח
export async function getFlightsByCityName(req, res) {
  const city = req.params.city?.trim().toLowerCase();

  if (!city) {
    return res.status(400).json({ error: "City name is required." });
  }

  try {
    const cityFlightsDocs = await getFlightsByCity(city);
    if (!cityFlightsDocs.length) {
      return res.status(404).json({ error: `No flights found for city: ${city}` });
    }

    const allFlights = cityFlightsDocs.flatMap((doc) =>
      (doc.airlines || []).map((airline, idx) => ({
        id: `${doc._id}_${idx}`,
        airline: airline.name,
        departureTime: airline.departureTime,
        price: airline.price,
        city: doc.city,
      }))
    );

    return res.status(200).json(allFlights);
  } catch (error) {
    console.error("Error fetching flights by city:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
