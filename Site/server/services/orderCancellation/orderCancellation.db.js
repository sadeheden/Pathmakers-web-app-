// orderCancellation.db.js
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

export async function findOrderForCancellation(orderId, userId) {
  const client = await getClient();
  const db = client.db(dbName);

  const collections = ["orders", "orders2"];
  for (const name of collections) {
    const filter = {
      _id: new ObjectId(orderId),
      $or: [
        { user_id: new ObjectId(userId) },
        { userId: new ObjectId(userId) },
        { user_id: userId },
        { userId: userId }
      ]
    };
    const order = await db.collection(name).findOne(filter);
    if (order) return { order, collection: name };
  }
  return null;
}

export async function cancelOrderInDb(orderId, collectionName) {
  const client = await getClient();
  const db = client.db(dbName);
  return db.collection(collectionName).updateOne(
    { _id: new ObjectId(orderId) },
    { $set: { status: "cancelled", cancelled: true, cancelled_at: new Date(), updated_at: new Date() } }
  );
}

export async function createCancellationRecord(orderId, userId, order, collectionName, reason) {
  const client = await getClient();
  const db = client.db(dbName);
  return db.collection("cancelled_orders").insertOne({
    original_order_id: new ObjectId(orderId),
    user_id: new ObjectId(userId),
    cancelled_at: new Date(),
    original_collection: collectionName,
    cancellation_reason: reason,
    refund_status: "pending",
    original_order_data: order
  });
}

export async function getCancelledOrdersByUserId(userId) {
  const client = await getClient();
  const db = client.db(dbName);
  return db.collection("cancelled_orders").find({ user_id: new ObjectId(userId) }).sort({ cancelled_at: -1 }).toArray();
}

export async function checkOrderCancellationEligibility(orderId, userId) {
  const result = await findOrderForCancellation(orderId, userId);
  if (!result) return null;
  const { order } = result;
  const isCancelled = order.status === "cancelled" || order.cancelled === true;
  const tripStartDate = order.trip_start_date || order.trip_date || order.tripDate || order.startDate;
  const canCancel = !isCancelled && (!tripStartDate || new Date(tripStartDate) > new Date());
  return {
    canCancel,
    reason: canCancel ? "Order can be cancelled" : isCancelled ? "Order already cancelled" : "Trip already started",
    tripStartDate,
    currentStatus: order.status || "active"
  };
}
