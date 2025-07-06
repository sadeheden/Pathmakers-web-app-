import { ObjectId } from "mongodb";
import { getDb } from "../db.js"; // See below for db.js

// Get all orders for a specific user
export async function findOrdersByUserId(userId) {
    const db = await getDb();
    return db.collection("orders").find({ user_id: new ObjectId(userId) }).toArray();
}

// Insert a new order
export async function insertOrder(orderData) {
    const db = await getDb();
    return db.collection("orders").insertOne(orderData);
}
