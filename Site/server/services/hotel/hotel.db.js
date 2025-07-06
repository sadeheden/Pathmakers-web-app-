import { MongoClient, ObjectId } from "mongodb";

const COLLECTION_NAME = "hotels";

async function connectDB() {
const client = await MongoClient.connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true
});

  const db = client.db(process.env.DB_NAME);
  return { client, db };
}

export async function getAllHotelsFromDatabase() {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).find({ isDeleted: { $ne: true } }).toArray();
  } finally {
    client.close();
  }
}

export async function getHotelByIdFromDatabase(id) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id), isDeleted: { $ne: true } });
  } finally {
    client.close();
  }
}

export async function saveHotelToDatabase(hotel) {
  const { client, db } = await connectDB();
  try {
    return await db.collection(COLLECTION_NAME).insertOne(hotel);
  } finally {
    client.close();
  }
}

export async function updateHotelInDatabase(hotel, id) {
  const { client, db } = await connectDB();
  try {
    return await db
      .collection(COLLECTION_NAME)
      .updateOne({ _id: new ObjectId(id) }, { $set: hotel });
  } finally {
    client.close();
  }
}

export async function deleteHotelInDatabase(id) {
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

// New: get hotels by city (case insensitive)
export async function getHotelsByCity(city) {
  const { client, db } = await connectDB();
  try {
    return await db
      .collection(COLLECTION_NAME)
      .find({ city: { $regex: `^${city}$`, $options: "i" }, isDeleted: { $ne: true } })
      .toArray();
  } finally {
    client.close();
  }
}
