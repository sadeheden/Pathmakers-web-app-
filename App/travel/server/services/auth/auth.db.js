// server/services/db.js

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

let client;
let db;

export async function connectDB() {
  if (db) return db;

  if (!client) {
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  await client.connect();
  db = client.db(dbName);

  console.log(`📦 Connected to database: ${dbName}`);
  return db;
}
