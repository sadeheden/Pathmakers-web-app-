// server/services/auth/auth.db.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// טוען את משתני הסביבה מהקובץ .env
dotenv.config();

// שולף את משתני הסביבה
const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

// בדיקה מוקדמת שהמשתנים קיימים
if (!uri) {
  throw new Error('Missing CONNECTION_STRING in environment variables');
}
if (!dbName) {
  throw new Error('Missing DB_NAME in environment variables');
}

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

// פונקציה שמחזירה את אוסף המשתמשים
export async function getUserCollection() {
  const db = await connectDB();
  return db.collection('Users'); 
}
