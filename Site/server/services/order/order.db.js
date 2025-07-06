import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
    throw new Error("❌ Missing CONNECTION_STRING or DB_NAME in environment variables.");
}

const client = new MongoClient(uri);

export async function getDb() {
    if (!client.topology || !client.topology.isConnected()) {
        console.log("🔌 Connecting to MongoDB...");
        await client.connect();
        console.log("✅ Connected to MongoDB.");
    }
    return client.db(dbName);
}
