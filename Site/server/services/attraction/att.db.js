import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const COLLECTION_NAME = 'attractions';

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;
let db;

async function connectDB() {
  if (!db) {
client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log("✅ MongoDB connected for attractions");
  }
  return db;
}

export async function getAllAttractionsFromDatabase() {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).find().toArray();
}

export async function getAttractionsByCityFromDatabase(city) {
  const db = await connectDB();
  return db
    .collection(COLLECTION_NAME)
    .find({ city: { $regex: new RegExp(`^${city}$`, 'i') }, isDeleted: { $ne: true } })
    .toArray();
}

export async function getAttractionByIdFromDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
}

export async function saveAttractionToDatabase(attraction) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).insertOne(attraction);
}

export async function updateAttractionInDatabase(attraction, id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: attraction }
  );
}

export async function deleteAttractionInDatabase(id) {
  const db = await connectDB();
  return db.collection(COLLECTION_NAME).updateOne(
    { _id: new ObjectId(id) },
    { $set: { isDeleted: true } }
  );
}
