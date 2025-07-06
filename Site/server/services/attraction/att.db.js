import { MongoClient, ObjectId } from 'mongodb';

const COLLECTION_NAME = 'attractions';

async function connectDB() {
  const client = await MongoClient.connect(process.env.CONNECTION_STRING);
  const db = client.db(process.env.DB_NAME);
  return { client, db };
}
export async function getAllAttractionsFromDatabase() {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).find().toArray();
  } finally {
    client.close();
  }
}
export async function getAttractionsByCityFromDatabase(city) {
  const { client, db } = await connectDB();
  try {
    // Find attractions matching the city (case-insensitive for safety)
    return await db
      .collection(COLLECTION_NAME)
      .find({ city: { $regex: new RegExp(`^${city}$`, 'i') }, isDeleted: { $ne: true } })
      .toArray();
  } finally {
    client.close();
  }
}


export async function getAttractionByIdFromDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });
  } finally {
    client.close();
  }
}

export async function saveAttractionToDatabase(attraction) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).insertOne(attraction);
  } finally {
    client.close();
  }
}

export async function updateAttractionInDatabase(attraction, id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: attraction }
    );
  } finally {
    client.close();
  }
}

export async function deleteAttractionInDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDeleted: true } }
    );
  } finally {
    client.close();
  }
}
