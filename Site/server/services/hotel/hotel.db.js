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

// Accepts a 24-hex id (doc _id or city_id) OR a city name like "Paris"
export async function getHotelsByCityFromDatabase(cityOrId){
  const db = await connectDB();
  const hotelsCol = db.collection("hotels"); // make sure your collection is actually named "hotels"
  const escapeRegExp = (s)=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

  const raw = (cityOrId ?? "").toString().trim();
  const isHexId = raw && /^[0-9a-fA-F]{24}$/.test(raw);

  let filter = { isDeleted: { $ne: true } };

  if (isHexId) {
    // ONLY construct ObjectId if raw is a 24-hex string
    const oid = new ObjectId(raw);
    filter = { isDeleted: { $ne: true }, $or: [{ _id: oid }, { city_id: oid }] };
  } else if (raw) {
    // Name/slug match by city field (your schema sample uses { city: "Paris", hotels: [...] })
    const q = new RegExp(`^${escapeRegExp(raw)}$`, "i");
    filter = { isDeleted: { $ne: true }, city: q };
  }

  const docs = await hotelsCol.find(filter).toArray();

  // Your schema: one doc per city with hotels[]
  if (docs.length === 0) return { hotels: [] };
  if (docs.length === 1 && Array.isArray(docs[0].hotels)) return { hotels: docs[0].hotels };

  // If multiple docs matched, merge hotels[] arrays if present
  const merged = docs.flatMap(d => Array.isArray(d.hotels) ? d.hotels : []);
  if (merged.length) return { hotels: merged };

  // Fallback: treat the documents themselves as hotel rows
  return { hotels: docs };
}
