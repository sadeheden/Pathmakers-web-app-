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
   await client.db(dbName).command({ ping: 1 });
 } catch (e) {
   console.warn("🔄 MongoDB ping failed, recreating client…", e.message);
   try { await client.close().catch(() => {}); } catch {}
   client = new MongoClient(uri, mongoOptions);
   await client.connect();
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

    console.log("🔍 Searching for user_id:", userId);

    const looksLikeOid = /^[0-9a-fA-F]{24}$/.test(String(userId));
    const userOr = [{ user_id: String(userId) }];
    if (looksLikeOid) userOr.push({ user_id: new ObjectId(String(userId)) });

    const filter = { $or: userOr };                    // ✅ use both
    console.log("🔍 Using filter:", filter);

    const result = await db.collection("orders").find(filter).toArray();
    console.log("🔍 Found orders:", result.length);
    return result;
  });
}

// ADD near the other exports
export async function findOverlappingOrdersByUser(userId, startDate, endDate) {
  // Normalize to Date at noon UTC
  const toNoonUTC = (v) => {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v)) return v;
    const s = String(v).trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], 12, 0, 0));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  };

  const start = toNoonUTC(startDate);
  const end   = toNoonUTC(endDate);
  if (!start || !end || end < start) return [];

  return withRetry(async () => {
    const client = await getClient();
    const db = client.db(dbName);

    // Match user_id as ObjectId OR string
    const looksLikeOid = /^[0-9a-fA-F]{24}$/.test(String(userId));
    const userOr = [{ user_id: String(userId) }];
    if (looksLikeOid) userOr.push({ user_id: new ObjectId(String(userId)) });

    // Only non-cancelled should block
    const ACTIVE = { status: { $nin: ["cancelled", "refunded"] } };

    // $expr converts legacy string dates to Date, checks not null, then applies overlap
    const match = {
      ...ACTIVE,
      $or: userOr,
      $expr: {
        $let: {
          vars: {
            s0: { $ifNull: ["$trip_start_date", "$tripDate"] },
            e0: { $ifNull: ["$trip_end_date",   "$returnDate"] }
          },
          in: {
            $and: [
              { $ne: ["$$s0", null] },
              { $ne: ["$$e0", null] },
              {
                $lte: [
                  {
                    $cond: [
                      { $eq: [{ $type: "$$s0" }, "string"] },
                      { $toDate: "$$s0" },
                      "$$s0"
                    ]
                  },
                  { $literal: end }
                ]
              },
              {
                $gte: [
                  {
                    $cond: [
                      { $eq: [{ $type: "$$e0" }, "string"] },
                      { $toDate: "$$e0" },
                      "$$e0"
                    ]
                  },
                  { $literal: start }
                ]
              }
            ]
          }
        }
      }
    };

    console.log("🧭 Overlap $match:", JSON.stringify(match));

    let results = await db.collection("orders")
      .aggregate([
        { $match: match },
        {
          $project: {
            _id: 1, status: 1, user_id: 1, destination_city_name: 1,
            trip_start_date: 1, trip_end_date: 1, tripDate: 1, returnDate: 1
          }
        }
      ])
      .toArray();

    // Optional safety net: if nothing came back, fall back to a JS compare
    if (!results.length) {
      console.log("🧪 DB overlap empty; JS fallback scan");
      const all = await db.collection("orders")
        .find({ ...ACTIVE, $or: userOr })
        .project({
          _id: 1, status: 1, user_id: 1, destination_city_name: 1,
          trip_start_date: 1, trip_end_date: 1, tripDate: 1, returnDate: 1
        })
        .toArray();

      const toD = (v) => {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v)) return v;
        const s = String(v).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3], 12, 0, 0));
        const d = new Date(s);
        return isNaN(d) ? null : d;
      };

      results = all.filter((o) => {
        const s = toD(o.trip_start_date ?? o.tripDate);
        const e = toD(o.trip_end_date   ?? o.returnDate);
        return s && e && s <= end && e >= start;
      });
    }

    console.log("🧭 Overlap matches:", results.length);
    return results;
  });
}
