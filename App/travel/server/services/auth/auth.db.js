// services/auth/auth.db.js - גרסה מעודכנת
import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDB() {
  try {
    console.log('🔌 connectDB called - checking environment...');
    
    // שליפת משתני סביבה בתוך הפונקציה
    const uri = process.env.CONNECTION_STRING;
    const dbName = process.env.DB_NAME;

    console.log('📊 Environment check in connectDB:');
    console.log('- URI exists:', !!uri);
    console.log('- DB_NAME:', dbName);

    if (!uri) {
      throw new Error('Missing CONNECTION_STRING in environment variables');
    }
    if (!dbName) {
      throw new Error('Missing DB_NAME in environment variables');
    }

    // אם יש כבר חיבור פעיל
    if (db && client?.topology?.isConnected?.()) {
      console.log('✅ Using existing database connection');
      return db;
    }

    console.log('🔌 Creating new database connection...');

    // יצירת client חדש או שימוש בקיים
    if (!client) {
      console.log('🔧 Creating new MongoClient...');
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 5
      });
    }

    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    
    console.log('✅ Connected to MongoDB successfully');
    
    db = client.db(dbName);
    console.log(`📦 Database instance created: ${dbName}`);
    
    // בדיקת חיבור
    await db.admin().ping();
    console.log('✅ Database ping successful');
    
    return db;
    
  } catch (error) {
    console.error('❌ Database connection error in connectDB:', error);
    console.error('- Error name:', error.name);
    console.error('- Error message:', error.message);
    
    // ניקוי חיבורים לא תקינים
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('❌ Error closing client:', closeError);
      }
    }
    
    client = null;
    db = null;
    
    throw error;
  }
}

export async function getUserCollection() {
  try {
    console.log('👥 Getting user collection...');
    const database = await connectDB();
    return database.collection('Users');
  } catch (error) {
    console.error('❌ Error getting user collection:', error);
    throw error;
  }
}

export async function getLoginCollection() {
  try {
    console.log('🔐 Getting login collection...');
    const database = await connectDB();
    return database.collection('LoginLogs');
  } catch (error) {
    console.error('❌ Error getting login collection:', error);
    throw error;
  }
}

// פונקציה לבדיקת בריאות בסיס הנתונים
export async function checkDBHealth() {
  try {
    console.log('🏥 Checking database health...');
    const database = await connectDB();
    await database.admin().ping();
    
    const result = {
      healthy: true,
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME,
      message: 'Database connection is healthy'
    };
    
    console.log('✅ Database health check passed');
    return result;
    
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return {
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      message: 'Database connection failed'
    };
  }
}

// ניקוי חיבור בסגירת השרת
process.on('SIGINT', async () => {
  console.log('🔌 Shutting down - closing database connection...');
  if (client) {
    try {
      await client.close();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔌 Shutting down - closing database connection...');
  if (client) {
    try {
      await client.close();
      console.log('✅ Database connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    }
  }
  process.exit(0);
});