import { ObjectId } from "mongodb";
import { connectDB } from "../auth/auth.db.js"; // הנחה שיש לך פונקציה שמתחברת ומחזירה את ה-db

// ===== CONTROLLERS =====

// city
export const getCities = async (req, res) => {
  try {
    const db = await connectDB();
    const cities = await db.collection("city").find().toArray();
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const addCity = async (req, res) => {
  try {
    console.log("Received req.body:", req.body);
    const db = await connectDB();
    const cityName = typeof req.body.city === "string" ? req.body.city : req.body.city?.city || "";
    if (!cityName) {
      return res.status(400).json({ error: "City name is required" });
    }
    const city = { city: cityName };
    const result = await db.collection("city").insertOne(city);
    city._id = result.insertedId;
    res.status(201).json(city);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteCity = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    await db.collection("city").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "City deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hotels
export const getHotels = async (req, res) => {
  try {
    const db = await connectDB();
    const hotels = await db.collection("hotels").find().toArray();
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addHotel = async (req, res) => {
  try {
    const db = await connectDB();
    const hotel = req.body;
    const result = await db.collection("hotels").insertOne(hotel);
    hotel._id = result.insertedId;
    res.status(201).json(hotel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteHotel = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    await db.collection("hotels").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Hotel deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Flights
export const getFlights = async (req, res) => {
  try {
    const db = await connectDB();
    const flights = await db.collection("flights").find().toArray();
    res.json(flights);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addFlight = async (req, res) => {
  try {
    const db = await connectDB();
    const flight = req.body;
    const result = await db.collection("flights").insertOne(flight);
    flight._id = result.insertedId;
    res.status(201).json(flight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteFlight = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    await db.collection("flights").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Flight deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Attractions
export const getAttractions = async (req, res) => {
  try {
    const db = await connectDB();
    const attractions = await db.collection("attractions").find().toArray();
    res.json(attractions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addAttraction = async (req, res) => {
  try {
    const db = await connectDB();
    const attraction = req.body;
    const result = await db.collection("attractions").insertOne(attraction);
    attraction._id = result.insertedId;
    res.status(201).json(attraction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteAttraction = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    await db.collection("attractions").deleteOne({ _id: new ObjectId(id) });
    res.json({ message: "Attraction deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
