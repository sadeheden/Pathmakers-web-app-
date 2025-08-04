import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;

async function getClient() {
  if (!client || !client.topology?.isConnected()) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function findOrdersByUserIdFromDb(userId) {
  const client = await getClient();
  const db = client.db(dbName);
  return db.collection("orders").find({ user_id: new ObjectId(userId) }).toArray();
}

export async function insertOrderToDb(order) {
  const client = await getClient();
  const db = client.db(dbName);
  return await db.collection("orders").insertOne(order);
}
