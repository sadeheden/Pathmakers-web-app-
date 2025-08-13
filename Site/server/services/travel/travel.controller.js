
import { ObjectId } from "mongodb";
import { connectDB } from "../auth/auth.db.js";

// ===== CONTROLLERS =====

// Cities - יצירת עיר פשוטה בלבד
export const getCities = async (req, res) => {
  try {
    const db = await connectDB();
    const cities = await db.collection("city").find().toArray();
    res.json(cities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// הוסף את זה בתחילת הפונקציה addCity לדיבוג:
export const addCity = async (req, res) => {
  try {   
    const db = await connectDB();
    
    // קבלת שם העיר מה-body
    const cityName = typeof req.body.city === "string" ? req.body.city.trim() : "";
    console.log("🔍 DEBUG: Extracted cityName:", cityName);
    
    if (!cityName) {
      return res.status(400).json({ error: "City name is required" });
    }

    // בדיקה אם העיר כבר קיימת
    const existingCity = await db.collection("city").findOne({ city: cityName });
    if (existingCity) {
      console.log("🔍 DEBUG: City already exists:", existingCity);
      return res.status(409).json({ error: `City '${cityName}' already exists` });
    }

    // יצירת מסמך עיר פשוט - רק עם שם העיר!
    const cityDocument = { 
      city: cityName 
    };
    
    console.log("🔍 DEBUG: Creating city document:", JSON.stringify(cityDocument, null, 2));
    
    const result = await db.collection("city").insertOne(cityDocument);
    console.log("🔍 DEBUG: Insert result:", result);
    
    // בדיקה מה באמת נשמר במסד הנתונים
    const savedCity = await db.collection("city").findOne({ _id: result.insertedId });
    console.log("🔍 DEBUG: What was actually saved in DB:", JSON.stringify(savedCity, null, 2));
    
    // החזרת המסמך שנוצר עם ה-ID
    const createdCity = {
      _id: result.insertedId,
      city: cityName
    };    
    res.status(201).json(createdCity);
  } catch (err) {
    console.error("❌ Error creating city:", err);
    res.status(500).json({ error: err.message });
  }
};

// חיפוש עיר לפי שם
export const getCityByName = async (req, res) => {
  try {
    const db = await connectDB();
    const cityName = req.params.name;
    
    const city = await db.collection("city").findOne({ city: cityName });
    
    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }
    
    res.json(city);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const deleteCity = async (req, res) => {
  try {
    const db = await connectDB();
    const id = req.params.id;
    const result = await db.collection("city").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "City not found" });
    }
    
    res.json({ message: "City deleted successfully" });
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
    const hotel = {
      name: req.body.name,
      city: req.body.city,
      price: parseFloat(req.body.price),
      stars: req.body.stars || 3
    };
    
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
    const result = await db.collection("hotels").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    res.json({ message: "Hotel deleted successfully" });
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
    const flight = {
      city: req.body.city,
      airline: req.body.airline,
      price: parseFloat(req.body.price),
      duration: req.body.duration,
      departureTime: req.body.departureTime || new Date().toISOString()
    };
    
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
    const result = await db.collection("flights").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Flight not found" });
    }
    
    res.json({ message: "Flight deleted successfully" });
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
    const attraction = {
      name: req.body.name,
      city: req.body.city,
      price: parseFloat(req.body.price),
      openingHours: req.body.openingHours,
      description: req.body.description || ""
    };
    
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
    const result = await db.collection("attractions").deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Attraction not found" });
    }
    
    res.json({ message: "Attraction deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
