// flights.db.js
import { MongoClient, ObjectId } from "mongodb";

const COLLECTION_NAME = "flights";

async function connectDB() {
  const client = await MongoClient.connect(process.env.CONNECTION_STRING);
  const db = client.db(process.env.DB_NAME);
  return { client, db };
}

export async function getFlightsByCity(city) {
  const { client, db } = await connectDB();
  try {
    const flights = await db
      .collection(COLLECTION_NAME)
      .find({ city: { $regex: `^${city}$`, $options: "i" } })
      .toArray();
    return flights;
  } finally {
    await client.close();
  }
}

export async function getAllFlightsFromDatabase() {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).find().toArray();
  } finally {
    await client.close();
  }
}

export async function getFlightByIdFromDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  } finally {
    await client.close();
  }
}

export async function saveFlightToDatabase(flight) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).insertOne(flight);
  } finally {
    await client.close();
  }
}

export async function updateFlightInDatabase(updateData, id) {
  const { client, db } = await connectDB();
  try {
    return await db
      .collection(COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(id) }, updateData);
  } finally {
    await client.close();
  }
}

export async function deleteFlightInDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });
  } finally {
    await client.close();
  }
}
