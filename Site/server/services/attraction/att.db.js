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
// === NEW: resolve names for city-doc schema =============================

// Returns a de-duplicated list of attraction names for multiple city docs
export async function getAttractionNamesByCityDocIds(ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const db = await connectDB();

  const objectIds = ids
    .map(String)
    .filter(s => /^[0-9a-fA-F]{24}$/.test(s))
    .map(s => new ObjectId(s));

  if (!objectIds.length) return [];

  const docs = await db.collection(COLLECTION_NAME)
    .find({ _id: { $in: objectIds }, isDeleted: { $ne: true } })
    .project({ attractions: 1 })
    .toArray();

  const names = [];
  for (const d of docs) {
    const arr = Array.isArray(d?.attractions) ? d.attractions : [];
    for (const a of arr) {
      const n = a?.name || a?.title || a?.label;
      if (n) names.push(n);
    }
  }

  // de-dup while preserving order
  return Array.from(new Set(names));
}

// Returns a single attraction name by city doc id and array index
export async function getAttractionNameByDocAndIndex(id, idx) {
  if (!id || Number.isNaN(Number(idx))) return null;
  const db = await connectDB();

  const doc = await db.collection(COLLECTION_NAME).findOne(
    { _id: new ObjectId(String(id)), isDeleted: { $ne: true } },
    { projection: { attractions: 1 } }
  );

  const arr = Array.isArray(doc?.attractions) ? doc.attractions : [];
  const item = arr[Number(idx)];
  if (!item) return null;

  return item.name || item.title || item.label || null;
}
