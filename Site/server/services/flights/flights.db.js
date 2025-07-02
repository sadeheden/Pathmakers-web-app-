import { MongoClient, ObjectId } from "mongodb";

const COLLECTION_NAME = "flights";

async function connectDB() {
  const client = await MongoClient.connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const db = client.db(process.env.DB_NAME);
  return { client, db };
}

export async function getAllFlightsFromDatabase() {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).find().toArray();
  } finally {
    client.close();
  }
}

export async function getFlightByIdFromDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  } finally {
    client.close();
  }
}

export async function saveFlightToDatabase(flight) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).insertOne(flight);
  } finally {
    client.close();
  }
}

export async function updateFlightInDatabase(flight, id) {
  const { client, db } = await connectDB();
  try {
    return await db
      .collection(COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(id) }, { $set: flight });
  } finally {
    client.close();
  }
}

export async function deleteFlightInDatabase(id) {
  const { client, db } = await connectDB();
  try {
    // soft delete
    return await db
      .collection(COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(id) }, { $set: { isDeleted: true } });
  } finally {
    client.close();
  }
}

// New: get flights by city (case insensitive)
export async function getFlightsByCity(city) {
  const { client, db } = await connectDB();
  try {
    return await db
      .collection(COLLECTION_NAME)
      .find({ city: { $regex: `^${city}$`, $options: "i" } })
      .toArray();
  } finally {
    client.close();
  }
}
