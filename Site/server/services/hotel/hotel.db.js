import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "hotels";
const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;
let db;

async function connectDB() {
  if (!db) {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log("✅ MongoDB connected for hotels");
  }
  return db;
}

// Get all hotels
export async function getAllHotelsFromDatabase() {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME)
           .find({ isDeleted: { $ne: true } })
           .toArray();
}

// Get hotel by ID
export async function getHotelByIdFromDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME)
           .findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });
}

// Add new hotel
export async function saveHotelToDatabase(hotel) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).insertOne(hotel);
}

// Update hotel
export async function updateHotelInDatabase(hotel, id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME)
           .updateOne({ _id: new ObjectId(id) }, { $set: hotel });
}

// Delete hotel (soft delete)
export async function deleteHotelInDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME)
           .updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true } });
}

// Get hotels by city (case-insensitive)
export async function getHotelsByCityFromDatabase(cityId) {
  const db = await connectDB(); // השתמש ב-connectDB()
  return db.collection("hotels").findOne({
    destination_city_id: new ObjectId(cityId),
    isDeleted: { $ne: true }
  });
}
