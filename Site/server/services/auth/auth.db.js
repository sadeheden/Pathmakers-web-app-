import { MongoClient } from "mongodb";

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;
let db;

export async function connectDB() {
    if (db) return db; // Return cached DB if already connected

    if (!client) {
        client = new MongoClient(uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
    }

    db = client.db(dbName);
    return db;
}
