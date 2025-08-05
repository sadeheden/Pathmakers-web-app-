import { MongoClient, ObjectId } from 'mongodb';

let client = null;
let db = null;

async function connectToDB() {
  if (!client || !client.topology || client.topology.isDestroyed()) {
    client = new MongoClient(process.env.CONNECTION_STRING);
    await client.connect();
    db = client.db(process.env.DB_NAME);
    console.log("✅ Connected to MongoDB");
  }
  return db;
}

export async function getAllCitiesFromDatabase() {
  try {
    const db = await connectToDB();
    const cities = await db.collection('city').find().toArray();
    return cities;
  } catch (error) {
    console.error("Error fetching cities from database:", error);
    throw new Error(`Error fetching cities: ${error.message}`);
  }
}

export async function getCityById(id) {
  try {
    const db = await connectToDB();
    return await db.collection('city').findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error("Error fetching city by ID from database:", error);
    throw error;
  }
}

export async function getCityByNameFromDatabase(cityName) {
  try {
    const db = await connectToDB();
    return await db.collection('city').findOne({ city: { $regex: `^${cityName}$`, $options: 'i' } });
  } catch (error) {
    console.error("Error fetching city by name from database:", error);
    throw error;
  }
}

export async function saveCityToDatabase(city) {
  try {
    const db = await connectToDB();
    return await db.collection('city').insertOne(city);
  } catch (error) {
    console.error("Error saving city to database:", error);
    throw error;
  }
}

export async function updateCityInDatabase(newData, id) {
  try {
    const db = await connectToDB();
    const collection = db.collection('city');

    const existingCity = await collection.findOne({ _id: new ObjectId(id) });
    if (!existingCity) throw new Error('City not found');

    const updatedHotels = [...(existingCity.hotels || []), ...(newData.hotels || [])];
    const updatedFlights = [...(existingCity.flights || []), ...(newData.flights || [])];
    const updatedAttractions = [...(existingCity.attractions || []), ...(newData.attractions || [])];

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          hotels: updatedHotels,
          flights: updatedFlights,
          attractions: updatedAttractions
        }
      }
    );

    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error("Error updating city in database:", error);
    throw error;
  }
}

// הפונקציה החדשה לעדכון אטרקציות בלבד
export async function updateCityAttractionsInDatabase(id, attractions) {
  try {
    const db = await connectToDB();
    const collection = db.collection('city');

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { attractions } }
    );

    if (result.matchedCount === 0) {
      throw new Error('City not found');
    }

    return await collection.findOne({ _id: new ObjectId(id) });
  } catch (error) {
    console.error("Error updating city attractions in database:", error);
    throw error;
  }
}

export async function deleteCityInDatabase(id) {
  try {
    const db = await connectToDB();
    return await db.collection('city').updateOne(
      { _id: new ObjectId(id) },
      { $set: { isDeleted: true } }
    );
  } catch (error) {
    console.error("Error deleting city from database:", error);
    throw error;
  }
}
