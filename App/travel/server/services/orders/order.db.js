// order.db.js
import { MongoClient, ObjectId } from "mongodb";

let client;

async function getClient() {
  const uri = process.env.CONNECTION_STRING;
  if (!uri) {
    throw new Error('MongoDB connection string is not defined! Check your .env.local file and dotenv config.');
  }
  if (!client || !client.topology?.isConnected()) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function findOrdersByUserIdFromDb(userId) {
  const client = await getClient();
  const db = client.db(process.env.DB_NAME);
  return db.collection("orders").find({ user_id: new ObjectId(userId) }).toArray();
}

export async function insertOrderToDb(order) {
  const client = await getClient();
  const db = client.db(process.env.DB_NAME);
  return await db.collection("orders").insertOne(order);
}