import { MongoClient } from "mongodb";

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

// הדפסת משתני סביבה לבדיקה
console.log("CONNECTION_STRING:", uri);
console.log("DB_NAME:", dbName);

let client;
let db;

export async function connectDB() {
    if (db) return db;

    if (!client) {
        client = await MongoClient.connect(process.env.CONNECTION_STRING, {
        useNewUrlParser: true
});
        await client.connect();
    }

    db = client.db(dbName);
    return db;
}
