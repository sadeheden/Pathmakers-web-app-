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
    if (!userObjectId) {
      return res.status(401).json({ message: 'Unauthorized (invalid user id in token)' });
    }

    // 👇 Get DB first (we use it for the overlap check and later work)
    const db = await connectDB();

    const {
      departureCityId,
      departureCityName,
      destinationCityId,
      destinationCityName,
      flightId,
      flightName = '',
      hotelId = '',
      hotelName = '',

      // from RN
      departureDate,   // ISO
      returnDate,      // ISO
      tripDuration,    // number

      attractions = [],     // can be raw ObjectId strings or objects with _id
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
    if ((tripStart && isNaN(tripStart)) || (tripEnd && isNaN(tripEnd))) {
      return res.status(400).json({ message: 'Invalid departureDate/returnDate' });
    }
    const tripDays  = Number.isFinite(Number(tripDuration))
      ? Number(tripDuration)
      : (tripStart && tripEnd ? Math.max(1, Math.ceil((tripEnd - tripStart) / 86400000)) : null);

    // ⛔ Prevent double-booking: edge-inclusive overlap (blocks same-day touch)
    // Change to $lt/$gt if you want to ALLOW back-to-back trips.
    if (tripStart && tripEnd) {
      const existing = await db.collection('orders').findOne({
        user_id: userObjectId,
        status: { $nin: ['cancelled'] },
        trip_start_date: { $lte: tripEnd },
        trip_end_date:   { $gte: tripStart },
      });
      if (existing) {
        return res.status(409).json({
          message: "Can't book these dates — you already have a trip that overlaps those days.",
          conflict_order_id: String(existing._id),
          existing_trip_range: {
            start: existing.trip_start_date,
            end: existing.trip_end_date
          }
        });
      }
    }

    // ---- helper: pull a 24-hex id from a possibly-compound value like "68075f..._0" or "68...-1"
    const extractPureId = (val) => {
      if (!val) return null;
      const s = String(val);
      const parts = s.split(/[-_]/g);
      for (const p of parts) if (/^[0-9a-fA-F]{24}$/.test(p)) return p;
      if (/^[0-9a-fA-F]{24}$/.test(s)) return s;
      return null;
    };

    // Handle attractions
    let processedAttractions = [];
    let attractionNames = [];

    if (Array.isArray(attractions) && attractions.length > 0) {
      const validObjectIds = attractions
        .map(attr => {
          if (typeof attr === 'string' && /^[0-9a-fA-F]{24}$/.test(attr)) return toObjectId(attr);
          if (attr && typeof attr === 'object' && attr._id) {
            const id = typeof attr._id === 'string' ? attr._id : attr._id.toString();
            if (/^[0-9a-fA-F]{24}$/.test(id)) return toObjectId(id);
          }
          return null;
        })
        .filter(Boolean);

      processedAttractions = validObjectIds;

      if (validObjectIds.length > 0) {
        try {
          const docs = await db.collection('attractions')
            .find({ _id: { $in: validObjectIds } }, { projection: { name: 1, title: 1, attraction_name: 1 } })
            .toArray();
          attractionNames = docs.map(d => d.name || d.title || d.attraction_name || 'Unnamed Attraction').filter(Boolean);
        } catch (err) {
          console.warn('Failed to fetch attraction names:', err);
          attractionNames = [];
        }
      }
    }

    if (processedAttractions.length === 0 && destinationCityId) {
      try {
        const destObjectId = toObjectId(destinationCityId);
        if (destObjectId) {
          const cityAttractions = await db.collection('attractions').find({
            $or: [
              { city_id: destObjectId },
              { cityId: destObjectId },
              { destination_city_id: destObjectId }
            ]
          }).toArray();

          if (cityAttractions.length > 0) {
            processedAttractions = cityAttractions.map(attr => attr._id);
            attractionNames = cityAttractions
              .map(attr => attr.name || attr.title || attr.attraction_name || 'Unnamed Attraction')
              .filter(Boolean);
          }
        }
      } catch (err) {
        console.warn('Failed to auto-fetch city attractions:', err);
      }
    }

    const depObjId  = toObjectId(extractPureId(departureCityId));
    const destObjId = toObjectId(extractPureId(destinationCityId));
    const flightObj = toObjectId(extractPureId(flightId));
    const hotelObj  = hotelId ? toObjectId(extractPureId(hotelId)) : null;

    const doc = {
      user_id: userObjectId,

      departure_city_id: depObjId,
      departure_city_name: String(departureCityName),

      destination_city_id: destObjId,
      destination_city_name: String(destinationCityName),

      flight_id: flightObj,
      flight_name: String(flightName || ''),

      hotel_id: hotelObj,
      hotel_name: String(hotelName || ''),

      attractions: processedAttractions,
      attraction_names: attractionNames,

      transportation: String(transportation || ''),
      payment_method: String(paymentMethod || ''),
      total_price: Number(totalPrice) || 0,

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
    });
  } catch (e) {
    console.error('createOrder error:', e);
    return res.status(500).json({ message: 'Failed to create order' });
  }
}


// Add this to your order.controller.js or create a separate attractions controller
export async function checkAvailability(req, res) {
  try {
    const db = await connectDB();
    const userId = req.user?.id || req.user?.userId || req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'Missing start/end' });

    const tripStart = new Date(start);
    const tripEnd = new Date(end);

    // Edge-inclusive overlap
    const existing = await db.collection('orders').findOne({
      user_id: toObjectId(userId),
      status: { $nin: ['cancelled'] },
      trip_start_date: { $lte: tripEnd },
      trip_end_date:   { $gte: tripStart },
    });

    if (existing) {
      return res.status(409).json({
        message: "Can't book these dates — you already have a trip that overlaps those days.",
        conflict_order_id: String(existing._id),
        existing_trip_range: {
          start: existing.trip_start_date,
          end: existing.trip_end_date
        }
      });
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Availability check failed' });
  }
}

export async function getAttractionsByCity(req, res) {
  try {
    const { cityId } = req.params;
    
    if (!cityId || !ObjectId.isValid(cityId)) {
      return res.status(400).json({ message: 'Invalid city ID' });
    }

    const db = await connectDB();
    const cityObjectId = new ObjectId(cityId);

    // Try multiple possible field names for city reference
    const attractions = await db.collection('attractions').find({
      $or: [
        { city_id: cityObjectId },
        { cityId: cityObjectId },
        { destination_city_id: cityObjectId }
      ]
    }).toArray();

    // Convert ObjectIds to strings for JSON serialization
    const serializedAttractions = attractions.map(attr => ({
      ...attr,
      _id: attr._id.toString(),
      city_id: attr.city_id?.toString(),
      cityId: attr.cityId?.toString(),
      destination_city_id: attr.destination_city_id?.toString()
    }));

    return res.status(200).json({ 
      success: true, 
      attractions: serializedAttractions,
      count: serializedAttractions.length
    });

  } catch (error) {
    console.error('getAttractionsByCity error:', error);
    return res.status(500).json({ message: 'Failed to fetch attractions' });
  }
}

// Add this route to your order.router.js
// router.get('/attractions/city/:cityId', authenticateUser, getAttractionsByCity);
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

  // 1) Coerce string 24-hex ids to ObjectId so lookups work
  {
    $addFields: {
      departure_city_id: {
        $cond: [
          {
            $and: [
              { $eq: [ { $type: "$departure_city_id" }, "string" ] },
              { $regexMatch: { input: "$departure_city_id", regex: /^[0-9a-f]{24}$/i } }
            ]
          },
          { $toObjectId: "$departure_city_id" },
          "$departure_city_id"
        ]
      },
      destination_city_id: {
        $cond: [
          {
            $and: [
              { $eq: [ { $type: "$destination_city_id" }, "string" ] },
              { $regexMatch: { input: "$destination_city_id", regex: /^[0-9a-f]{24}$/i } }
            ]
          },
          { $toObjectId: "$destination_city_id" },
          "$destination_city_id"
        ]
      },
      flight_id: {
        $cond: [
          {
            $and: [
              { $eq: [ { $type: "$flight_id" }, "string" ] },
              { $regexMatch: { input: "$flight_id", regex: /^[0-9a-f]{24}$/i } }
            ]
          },
          { $toObjectId: "$flight_id" },
          "$flight_id"
        ]
      },
      hotel_id: {
        $cond: [
          {
            $and: [
              { $eq: [ { $type: "$hotel_id" }, "string" ] },
              { $regexMatch: { input: "$hotel_id", regex: /^[0-9a-f]{24}$/i } }
            ]
          },
          { $toObjectId: "$hotel_id" },
          "$hotel_id"
        ]
      }
    }
  },

  // 2) Lookups
  { $lookup: { from: 'city',    localField: 'departure_city_id',   foreignField: '_id', as: 'departureCity' } },
  { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },

  { $lookup: { from: 'city',    localField: 'destination_city_id', foreignField: '_id', as: 'destinationCity' } },
  { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },

  { $lookup: { from: 'flights', localField: 'flight_id', foreignField: '_id', as: 'flight' } },
  { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },

  { $lookup: { from: 'hotels',  localField: 'hotel_id', foreignField: '_id', as: 'hotel' } },
  { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },

  // 3) Project friendly names with fallbacks
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

      // derive names from joined docs; if missing, fall back to stringified id
   departure_city_name: {
  $ifNull: [
    '$departureCity.name',
    { $ifNull: [
      '$departureCity.city',
      { $ifNull: [
        '$departureCity.cityName',
        { $ifNull: [
          '$departure_city_name',     // 👈 stored string from createOrder
          { $toString: '$departure_city_id' }
        ] }
      ] }
    ] }
  ]
},
destination_city_name: {
  $ifNull: [
    '$destinationCity.name',
    { $ifNull: [
      '$destinationCity.city',
      { $ifNull: [
        '$destinationCity.cityName',
        { $ifNull: [
          '$destination_city_name',   // 👈 stored string from createOrder
          { $toString: '$destination_city_id' }
        ] }
      ] }
    ] }
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
          { $ifNull: [
            '$hotel.hotel_name',
            { $ifNull: [
              '$hotel.hotelName',
              { $toString: '$hotel_id' }
            ] }
          ] }
        ]
      }
    }
  },

  { $sort: { created_at: -1 } }
]).toArray();


    // stringify IDs for RN
const safe = orders.map(o => ({
  // 1) put the raw projection first
  ...o,

  // 2) then override with string versions so they don't get overwritten
  _id: o._id?.toString(),
  user_id: o.user_id?.toString(),
  departure_city_id: o.departure_city_id?.toString() || null,
  destination_city_id: o.destination_city_id?.toString() || null,
  flight_id: o.flight_id?.toString() || null,
  hotel_id: o.hotel_id?.toString() || null,
  attractions: Array.isArray(o.attractions) ? o.attractions.map(a => a?.toString?.() || a) : [],
  createdAt: o.createdAt || o.created_at,
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