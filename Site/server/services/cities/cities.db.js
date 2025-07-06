import { MongoClient, ObjectId } from 'mongodb';
 
export async function getAllCitiesFromDatabase() {
    let client = null;
    try {
        console.log("Opening connection to database...");
        client = await MongoClient.connect(process.env.CONNECTION_STRING, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
 
        console.log("Connection successful! Fetching cities...");
        let db = client.db(process.env.DB_NAME);
        const cities = await db.collection('city').find().toArray();  // Fetch cities from the 'city' collection
 
        console.log("Cities fetched:", cities);  // Log the cities fetched
        return cities;
    } catch (error) {
        console.error("Error fetching cities from database:", error);  // Log any error during fetching
        throw new Error(`Error fetching cities: ${error.message}`);  // Provide a more detailed error message
    } finally {
        if (client) {
            client.close();
        }
        console.log("Connection closed.");
    }
}
 
 
 
 
// Fetch a city by its ID
export async function getCityById(id) {
    let client = null;
    try {
        client = await MongoClient.connect(process.env.CONNECTION_STRING);
        let db = client.db(process.env.DB_NAME);
       
        // Correctly instantiate ObjectId using 'new'
        return await db.collection('city').findOne({ _id: new ObjectId(id) });
    } catch (error) {
        console.error("Error fetching city by ID from database:", error);
        throw error;
    } finally {
        if (client) client.close();
    }
}
 
 
 
// Save a new city to the database
export async function saveCityToDatabase(city) {
    let client = null;
    try {
        client = await MongoClient.connect(process.env.CONNECTION_STRING);
        let db = client.db(process.env.DB_NAME);
        return await db.collection('city').insertOne(city);
    } catch (error) {
        console.error("Error saving city to database:", error);
        throw error;
    }
    finally {
        if (client)
            client.close();
    }
}
 
// Update a city's data in the database
export async function updateCityInDatabase(city, id) {
    let client = null;
    try {
        client = await MongoClient.connect(process.env.CONNECTION_STRING);
        let db = client.db(process.env.DB_NAME);
        return await db.collection('city').updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: city });
    } catch (error) {
        console.error("Error updating city in database:", error);
        throw error;
    }
    finally {
        if (client)
            client.close();
    }
}
 
// Mark a city as deleted in the database (soft delete)
export async function deleteCityInDatabase(id) {
    let client = null;
    try {
        client = await MongoClient.connect(process.env.CONNECTION_STRING);
        let db = client.db(process.env.DB_NAME);
        return await db.collection('city').updateOne({ _id: ObjectId.createFromHexString(id) }, { $set: { isDeleted: true } });
    } catch (error) {
        console.error("Error deleting city from database:", error);
        throw error;
    }
    finally {
        if (client)
            client.close();
    }
}