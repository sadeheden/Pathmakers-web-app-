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
export async function createOrder(req, res) {
  try {
    const uid = reqUserId(req);
    const userObjectId = toObjectId(uid);
    if (!userObjectId) return res.status(401).json({ message: 'Unauthorized (invalid user id in token)' });

    // Required (from your app)
    const {
      departureCityId,
      departureCityName,
      destinationCityId,
      destinationCityName,
      flightId,
      flightName = '',
      hotelId = '',
      hotelName = '',
      attractions = [],
      transportation = '',
      paymentMethod = '',
      totalPrice,
    } = req.body || {};

    // Basic validation
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

    // Convert to your DB schema (snake_case)
    // NOTE: your lookups expect ObjectId in *_id fields (city, flights, hotels)
    const doc = {
      user_id: userObjectId,

      departure_city_id: toObjectId(departureCityId) ?? departureCityId, // prefer ObjectId, fallback string
      departure_city_name: String(departureCityName),

      destination_city_id: toObjectId(destinationCityId) ?? destinationCityId,
      destination_city_name: String(destinationCityName),

      flight_id: toObjectId(flightId) ?? flightId,
      flight_name: String(flightName || ''),

      hotel_id: hotelId ? (toObjectId(hotelId) ?? hotelId) : null,
      hotel_name: String(hotelName || ''),

      attractions: Array.isArray(attractions)
        ? attractions.map((a) => toObjectId(a) ?? String(a))
        : [],

      transportation: String(transportation || ''),
      payment_method: String(paymentMethod || ''),

      total_price: Number(totalPrice) || 0,

      status: 'confirmed',
      created_at: new Date(),
      updated_at: new Date(),
    };

    const db = await connectDB();
    const result = await db.collection('orders').insertOne(doc);

    // Return flat doc (RN expects _id at root)
    return res.status(201).json({
      _id: result.insertedId,
      ...doc,
      // stringified ids for RN convenience
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
      ...o,
      _id: o._id?.toString(),
      user_id: o.user_id?.toString(),
      departure_city_id: o.departure_city_id?.toString(),
      destination_city_id: o.destination_city_id?.toString(),
      flight_id: o.flight_id?.toString(),
      hotel_id: o.hotel_id?.toString(),
      attractions: Array.isArray(o.attractions) ? o.attractions.map(a => a?.toString?.() || a) : []
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
