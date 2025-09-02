// services/order/order.db.js
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;

if (!uri || !dbName) {
  throw new Error("Missing CONNECTION_STRING or DB_NAME env variables");
}

let client;

// Dev-friendly TLS options (tighten for production)
const mongoOptions = {
  tls: true,
  tlsAllowInvalidCertificates: true, // DEV ONLY
  tlsAllowInvalidHostnames: true,    // DEV ONLY
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000,
};

async function getClient() {
  // Create client if needed
  if (!client) {
    console.log("🔗 Creating new MongoDB client...");
    client = new MongoClient(uri, mongoOptions);
    try {
      await client.connect();
      console.log("✅ MongoDB connected successfully");
      await client.db(dbName).admin().ping();
      console.log("✅ MongoDB ping successful");
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error.message);
      client = null;
      throw error;
    }
  }

  // Ensure connection is alive; if not, recreate client
  try {
    await client.db(dbName).command({ ping: 1 });
  } catch (e) {
    console.warn("🔄 Mongo ping failed, recreating client…", e.message);
    try { await client.close().catch(() => {}); } catch {}
    client = new MongoClient(uri, mongoOptions);
    await client.connect();
  }

  return client;
}

// Generic retry wrapper
async function withRetry(operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;

      const delay = Math.min(1000 * 2 ** (attempt - 1), 5000);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/** Insert one order and return the inserted document */
export async function insertOrderToDb(order) {
  return withRetry(async () => {
    const c = await getClient();
    const db = c.db(dbName);
    const res = await db.collection("orders").insertOne(order);
    return await db.collection("orders").findOne({ _id: res.insertedId });
  });
}

/** Find orders by userId (match string or ObjectId forms of user_id) */
export async function findOrdersByUserIdFromDb(userId) {
  return withRetry(async () => {
    const c = await getClient();
    const db = c.db(dbName);

    const looksLikeOid = /^[0-9a-fA-F]{24}$/.test(String(userId));
    const userOr = [{ user_id: String(userId) }];
    if (looksLikeOid) userOr.push({ user_id: new ObjectId(String(userId)) });

    const filter = { $or: userOr };
    return await db.collection("orders").find(filter).toArray();
  });
}

/** Find a single order by its _id */
export async function findOrderByIdFromDb(id) {
  return withRetry(async () => {
    const c = await getClient();
    const db = c.db(dbName);
    return await db.collection("orders").findOne({ _id: new ObjectId(String(id)) });
  });
}

/** Find overlapping orders for a user in [startDate, endDate] (blocks conflicts) */
export async function findOverlappingOrdersByUser(userId, startDate, endDate) {
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
    const c = await getClient();
    const db = c.db(dbName);

    const looksLikeOid = /^[0-9a-fA-F]{24}$/.test(String(userId));
    const userOr = [{ user_id: String(userId) }];
    if (looksLikeOid) userOr.push({ user_id: new ObjectId(String(userId)) });

    // Only active orders should block
    const ACTIVE = { status: { $nin: ["cancelled", "refunded"] } };

    // Convert legacy string dates to Date inside $expr and test overlap
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

    // Safety net: fall back to JS compare if the aggregation returns nothing
    if (!results.length) {
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

    return results;
  });
}
