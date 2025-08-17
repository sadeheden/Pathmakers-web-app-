import { ObjectId } from "mongodb";
import Hotel from "./hotel.model.js";

// Get all hotels
export async function getHotels(req, res) {
  try {
    const hotels = await Hotel.findAll();
    return res.status(200).json(hotels);
  } catch (error) {
    return res.status(500).json({ error: "Error fetching hotels." });
  }
}

// Get hotel by ID
export async function getHotelById(req, res) {
  const { id } = req.params;
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const hotel = await Hotel.findById(id);
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    return res.status(200).json(hotel);
  } catch (error) {
    return res.status(500).json({ error: "Error fetching hotel." });
  }
}

// Add hotel
export async function addHotel(req, res) {
  const { city, name, price, stars } = req.body;
  if (!city || !name || price == null || stars == null) {
    return res.status(400).json({ error: "City, name, price, and stars are required." });
  }

  const newHotel = new Hotel({ city, name, price, stars });
  try {
    const result = await newHotel.save();
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Error adding hotel." });
  }
}

// Update hotel
export async function updateHotel(req, res) {
  const { id } = req.params;
  const { city, name, price, stars } = req.body;
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });
  if (!city || !name || price == null || stars == null) {
    return res.status(400).json({ error: "City, name, price, and stars are required." });
  }

  const updatedHotel = new Hotel({ city, name, price, stars });
  try {
    const result = await updatedHotel.update(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Error updating hotel." });
  }
}

// Delete hotel
export async function deleteHotel(req, res) {
  const { id } = req.params;
  if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: "Invalid ID" });

  try {
    const result = await Hotel.delete(id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: "Error deleting hotel." });
  }
}

// Get hotels by city
export async function getHotelsByCityName(req, res){
  const city = req.params.city?.trim();
  if (!city) return res.status(400).json({ error: "City name required" });
  try {
    const data = await Hotel.findByCity(city);
    const hotels = Array.isArray(data?.hotels) ? data.hotels : [];
    return res.status(200).json({ hotels });
  } catch (error) {
    console.error("Error fetching hotels by city:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
