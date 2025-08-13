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

// order.db.js
export async function findOrdersByUserIdFromDb(userId) {
  const client = await getClient();
  const db = client.db(dbName);
  const looksLikeOid = typeof userId === "string" && /^[0-9a-fA-F]{24}$/.test(userId);
  const filter = looksLikeOid ? { user_id: new ObjectId(userId) } : { user_id: userId };
  return db.collection("orders").find(filter).toArray();
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

export async function findOrderByIdFromDb(orderId) {
  const client = await getClient();
  const db = client.db(dbName);
  return db.collection("orders").findOne({ _id: new ObjectId(orderId) });
}
