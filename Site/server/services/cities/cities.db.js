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

// כל הפונקציות שלך ↓↓

// ✅ get all cities
export async function getAllCitiesFromDatabase() {
    try {
        const db = await connectToDB();
        const cities = await db.collection('city').find().toArray();
        console.log("Cities fetched:", cities);
        return cities;
    } catch (error) {
        console.error("Error fetching cities from database:", error);
        throw new Error(`Error fetching cities: ${error.message}`);
    }
}

// ✅ get city by id
export async function getCityById(id) {
    try {
        const db = await connectToDB();
        return await db.collection('city').findOne({ _id: new ObjectId(id) });
    } catch (error) {
        console.error("Error fetching city by ID from database:", error);
        throw error;
    }
}

// ✅ save city
export async function saveCityToDatabase(city) {
    try {
        const db = await connectToDB();
        return await db.collection('city').insertOne(city);
    } catch (error) {
        console.error("Error saving city to database:", error);
        throw error;
    }
}

// ✅ update city
export async function updateCityInDatabase(city, id) {
    try {
        const db = await connectToDB();
        return await db.collection('city').updateOne(
            { _id: new ObjectId(id) },
            { $set: city }
        );
    } catch (error) {
        console.error("Error updating city in database:", error);
        throw error;
    }
}

// ✅ soft delete
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
