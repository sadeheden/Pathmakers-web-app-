import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const COLLECTION_NAME = "flights";
const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;
let db;

async function connectDB() {
  if (!db) {
client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log("✅ MongoDB connected for flights");
  }
  return db;
}

export async function getAllFlightsFromDatabase() {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).find().toArray();
}

export async function getFlightByIdFromDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

export async function saveFlightToDatabase(flight) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).insertOne(flight);
}

export async function updateFlightInDatabase(flight, id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: flight });
}

export async function deleteFlightInDatabase(id) {
  const db = await connectDB();
  // soft delete
  return db.collection(COLLECTION_NAME).updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true } });
}

// New: get flights by city (case insensitive)
export async function getFlightsByCity(city) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME)
    .find({ city: { $regex: `^${city}$`, $options: "i" } })
    .toArray();
}
