// controllers/orders.controller.js
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

/** Helpers */
const toObjectId = (v) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
const reqUserId = (req) => req.user?.id || req.user?.userId || req.user?._id || null;

/** ========= CREATE ORDER =========
 * Expects camelCase fields from RN and stores snake_case in Mongo.
 * Path: POST /api/orders
 */
// --- Helper: fetch all attraction ObjectIds for a destination city ---
async function fetchAttractionIdsForCity(db, destinationCityId, destinationCityName) {
  const ids = [];
  const destIdObj = toObjectId(destinationCityId);

  // 1) If attractions are embedded on the city doc as ObjectIds: city.attractions = [ObjectId,...]
  const cityDoc = destIdObj
    ? await db.collection('city').findOne({ _id: destIdObj })
    : null;

  if (cityDoc?.attractions && Array.isArray(cityDoc.attractions) && cityDoc.attractions.length) {
    for (const a of cityDoc.attractions) {
      // keep as ObjectId if already, else coerce
      ids.push(a instanceof ObjectId ? a : (toObjectId(a) ?? null));
    }
  }

  // 2) If you store each attraction as its own document in "attractions"
  // Try multiple possible keys so it works with different schemas.
  if (ids.length === 0) {
    const name = (cityDoc?.name || cityDoc?.city || cityDoc?.cityName || destinationCityName || '').trim();
    const nameRegex = name ? new RegExp(`^${name}$`, 'i') : null;

    const orClauses = [];
    if (destIdObj) orClauses.push({ city_id: destIdObj });
    if (nameRegex) {
      orClauses.push({ city: nameRegex }, { cityName: nameRegex }, { city_slug: name.toLowerCase() });
    }

    if (orClauses.length) {
      const cursor = db.collection('attractions').find(
        { $or: orClauses },
        { projection: { _id: 1 } }
      );
      const rows = await cursor.toArray();
      for (const r of rows) ids.push(r._id);
    }
  }

  // Filter out nulls/dupes
  return [...new Set(ids.filter(Boolean).map(x => (x instanceof ObjectId ? x : toObjectId(x)).toString()))]
         .map(s => new ObjectId(s));
}

// services/orders/order.controller.js

export async function createOrder(req, res) {
  try {
    const uid = reqUserId(req);
    const userObjectId = toObjectId(uid);
    if (!userObjectId) return res.status(401).json({ message: 'Unauthorized (invalid user id in token)' });

    const {
      departureCityId,
      departureCityName,
      destinationCityId,
      destinationCityName,
      flightId,
      flightName = '',
      hotelId = '',
      hotelName = '',

      // 👇 sent from RN
      departureDate,   // ISO
      returnDate,      // ISO
      tripDuration,    // number

      attractions = [],
      transportation = '',
      paymentMethod = '',
      totalPrice,
    } = req.body || {};

    const missing = [];
    if (!departureCityId) missing.push('departureCityId');
    if (!departureCityName) missing.push('departureCityName');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!destinationCityName) missing.push('destinationCityName');
    if (!flightId) missing.push('flightId');
    if (totalPrice === undefined || totalPrice === null) missing.push('totalPrice');
    if (missing.length) {
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(', ')}` });
    }

    const tripStart = departureDate ? new Date(departureDate) : null;
    const tripEnd   = returnDate ? new Date(returnDate) : null;
    const tripDays  = Number.isFinite(Number(tripDuration)) ? Number(tripDuration) : (
      tripStart && tripEnd ? Math.max(1, Math.ceil((tripEnd - tripStart) / 86400000)) : null
    );

    const db = await connectDB();

    // Best-effort resolve attraction names now so the profile can show them without extra calls
    let attractionNames = [];
    if (Array.isArray(attractions) && attractions.length) {
      const ids = attractions
        .map(a => toObjectId(a))
        .filter(Boolean);
      if (ids.length) {
        const rows = await db.collection('attractions')
          .find({ _id: { $in: ids } }, { projection: { name: 1 } })
          .toArray();
        attractionNames = rows.map(r => r?.name).filter(Boolean);
      }
    }

    const doc = {
      user_id: userObjectId,

      departure_city_id: toObjectId(departureCityId) ?? departureCityId,
      departure_city_name: String(departureCityName),

      destination_city_id: toObjectId(destinationCityId) ?? destinationCityId,
      destination_city_name: String(destinationCityName),

      flight_id: toObjectId(flightId) ?? flightId,
      flight_name: String(flightName || ''),

      // if hotelId is bad/empty, still store a readable hotel_name
      hotel_id: hotelId ? (toObjectId(hotelId) ?? hotelId) : null,
      hotel_name: String(hotelName || ''),

      attractions: Array.isArray(attractions)
        ? attractions.map((a) => toObjectId(a) ?? String(a))
        : [],
      attraction_names: attractionNames, // 👈 denormalized helper

      transportation: String(transportation || ''),
      payment_method: String(paymentMethod || ''),
      total_price: Number(totalPrice) || 0,

      // 👇 NEW date fields
      trip_start_date: tripStart || null,
      trip_end_date: tripEnd || null,
      trip_duration: tripDays ?? null,

      status: 'confirmed',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection('orders').insertOne(doc);

    return res.status(201).json({
      _id: result.insertedId,
      ...doc,
      _id_str: result.insertedId?.toString(),
      user_id_str: doc.user_id?.toString?.(),
      departure_city_id_str: doc.departure_city_id?.toString?.(),
      destination_city_id_str: doc.destination_city_id?.toString?.(),
      flight_id_str: doc.flight_id?.toString?.(),
      hotel_id_str: doc.hotel_id?.toString?.() ?? null,
    });
  } catch (e) {
    console.error('createOrder error:', e);
    return res.status(500).json({ message: 'Failed to create order' });
  }
}


/** ========= PROFILE ORDERS (yours, unchanged) =========
 * Orders for Profile.jsx (clean, no attraction formatting)
 */
export async function getOrdersForProfile(req, res) {
  try {
    const uid = req.user?.id || req.user?.userId;
    const userObjectId = toObjectId(uid);
    if (!userObjectId) return res.status(400).json({ message: 'Invalid user ID' });

    const db = await connectDB();

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },

      // IMPORTANT: your collection is "city" (singular)
      { $lookup: { from: 'city', localField: 'departure_city_id',   foreignField: '_id', as: 'departureCity' } },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },

      { $lookup: { from: 'city', localField: 'destination_city_id', foreignField: '_id', as: 'destinationCity' } },
      { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },

      { $lookup: { from: 'flights', localField: 'flight_id', foreignField: '_id', as: 'flight' } },
      { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },

      { $lookup: { from: 'hotels', localField: 'hotel_id', foreignField: '_id', as: 'hotel' } },
      { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          user_id: 1,
          departure_city_id: 1,
          destination_city_id: 1,
          flight_id: 1,
          hotel_id: 1,
          attractions: 1,
          transportation: 1,
          payment_method: 1,
          total_price: 1,
          created_at: 1,
          trip_start_date: 1,
trip_end_date: 1,
trip_duration: 1,
attraction_names: 1,

          departure_city_name: {
            $ifNull: [
              '$departureCity.name',
              { $ifNull: ['$departureCity.city', { $ifNull: ['$departureCity.cityName', { $toString: '$departure_city_id' }] }] }
            ]
          },
          destination_city_name: {
            $ifNull: [
              '$destinationCity.name',
              { $ifNull: ['$destinationCity.city', { $ifNull: ['$destinationCity.cityName', { $toString: '$destination_city_id' }] }] }
            ]
          },
          flight_name: {
            $ifNull: [
              '$flight.flight_number',
              { $ifNull: [
                '$flight.name',
                { $ifNull: [
                  '$flight.flightNumber',
                  {
                    $cond: [
                      { $or: [ { $ifNull: ['$flight.airline', false] }, { $ifNull: ['$flight.flight_number', false] } ] },
                      { $trim: { input: { $concat: [ { $ifNull: ['$flight.airline', ''] }, ' ', { $ifNull: ['$flight.flight_number', ''] } ] } } },
                      { $toString: '$flight_id' }
                    ]
                  }
                ] }
              ] }
            ]
          },
          hotel_name: {
            $ifNull: [
              '$hotel.name',
              { $ifNull: ['$hotel.hotel_name', { $ifNull: ['$hotel.hotelName', { $toString: '$hotel_id' }] }] }
            ]
          }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    // stringify IDs for RN
const safe = orders.map(o => ({
  _id: o._id?.toString(),
  user_id: o.user_id?.toString(),
  departure_city_id: o.departure_city_id?.toString() || null,
  destination_city_id: o.destination_city_id?.toString() || null,
  flight_id: o.flight_id?.toString() || null,
  hotel_id: o.hotel_id?.toString() || null,
  attractions: Array.isArray(o.attractions) ? o.attractions.map(a => a?.toString?.() || a) : [],
  createdAt: o.createdAt || o.created_at,   // ✅ unify
  ...o
}));


    return res.status(200).json({ success: true, orders: safe });
  } catch (err) {
    console.error('getOrdersForProfile error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

const COLLECTIONS = { cities: 'city', flights: 'flights', hotels: 'hotels' };

export async function getDynamicData(req, res) {
  try {
    const { type, ids } = req.body;
    if (!type || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid request' });

    const collection = COLLECTIONS[type];
    if (!collection) return res.status(400).json({ message: 'Invalid type' });

    const db = await connectDB();
    const out = {};
    for (const id of ids) {
      if (!id || !ObjectId.isValid(String(id))) { out[id] = null; continue; }
      const doc = await db.collection(collection).findOne({ _id: new ObjectId(String(id)) });
      out[id] = doc || null;
    }
    res.json({ success: true, data: out });
  } catch (e) {
    console.error('getDynamicData error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}