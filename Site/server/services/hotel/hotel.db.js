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

export async function getAllHotelsFromDatabase() {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).find({ isDeleted: { $ne: true } }).toArray();
}

export async function getHotelByIdFromDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });
}

export async function saveHotelToDatabase(hotel) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).insertOne(hotel);
}

export async function updateHotelInDatabase(hotel, id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: hotel });
}

export async function deleteHotelInDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true } });
}

// New: get hotels by city (case insensitive)
export async function getHotelsByCity(city) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).find({ city: { $regex: `^${city}$`, $options: "i" }, isDeleted: { $ne: true } }).toArray();
}
