// Fix for MongoDB SSL connection issues
// Update your order.db.js file

import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  throw new Error("Missing CONNECTION_STRING or DB_NAME env variables");
}

let client;

// Updated connection options to handle SSL issues
const mongoOptions = {
  // SSL/TLS options to fix the connection error
  tls: true,
  tlsAllowInvalidCertificates: true, // Only for development!
  tlsAllowInvalidHostnames: true,    // Only for development!
  
  // Connection pool options
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  
  // Retry options
  retryWrites: true,
  retryReads: true,
  
  // Additional stability options
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000,
};

async function getClient() {
  if (!client) {
    console.log("🔗 Creating new MongoDB client...");
    client = new MongoClient(uri, mongoOptions);
    
    try {
      await client.connect();
      console.log("✅ MongoDB connected successfully");
      
      // Test the connection
      await client.db(dbName).admin().ping();
      console.log("✅ MongoDB ping successful");
      
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
      client = null;
      throw error;
    }
  }

  // Check if client is still connected
  if (!client.topology || !client.topology.isConnected()) {
    console.log("🔄 MongoDB client disconnected, reconnecting...");
    try {
      await client.connect();
    } catch (error) {
      console.error("❌ MongoDB reconnection failed:", error.message);
      client = null;
      throw error;
    }
  }

  return client;
}

// Add connection retry wrapper
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Reset client on connection errors
      if (error.name === 'MongoNetworkError') {
        client = null;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Updated database functions with retry logic
export async function findOrdersByUserIdFromDb(userId) {
  return withRetry(async () => {
    const client = await getClient();
    const db = client.db(dbName);
    
    console.log("🔍 Searching for user_id:", userId); // ✅ ADD THIS
    
    const looksLikeOid = typeof userId === "string" && /^[0-9a-fA-F]{24}$/.test(userId);
    const filter = looksLikeOid ? { user_id: new ObjectId(userId) } : { user_id: userId };
    
    console.log("🔍 Using filter:", filter); // ✅ ADD THIS
    
    const result = await db.collection("orders").find(filter).toArray();
    console.log("🔍 Found orders:", result.length); // ✅ ADD THIS
    
    return result;
  });
}

export async function insertOrderToDb(order) {
  return withRetry(async () => {
    const client = await getClient();
    const db = client.db(dbName);
    const result = await db.collection("orders").insertOne(order);
    return {
      _id: result.insertedId,
      ...order
    };
  });
}

export async function findOrderByIdFromDb(orderId) {
  return withRetry(async () => {
    const client = await getClient();
    const db = client.db(dbName);
    return db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  });
}

// Add graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (client) {
    await client.close();
    console.log('✅ MongoDB connection closed.');
  }
  process.exit(0);
});