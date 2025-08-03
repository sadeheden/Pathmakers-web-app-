import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDB() {
  // שליפת משתני סביבה בתוך הפונקציה
  const uri = process.env.CONNECTION_STRING;
  const dbName = process.env.DB_NAME;

  if (!uri) {
    throw new Error('Missing CONNECTION_STRING in environment variables');
  }
  if (!dbName) {
    throw new Error('Missing DB_NAME in environment variables');
  }

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

export async function getUserCollection() {
  const database = await connectDB();
  return database.collection('Users');
}
