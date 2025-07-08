import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  throw new Error("Missing CONNECTION_STRING or DB_NAME env variables");
}

let client;  // חשוב להגדיר את המשתנה מחוץ לפונקציה

async function getClient() {
  if (!client || !client.topology || !client.topology.isConnected()) {
    client = new MongoClient(uri);  // בלי const
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
  const result = await db.collection("orders").insertOne(order);
  return {
    _id: result.insertedId,
    ...order
  };
}

