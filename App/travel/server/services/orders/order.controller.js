// order.controller.js
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

/** Helper: convert string to ObjectId if valid */
const toObjectId = (v) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);

/** ======================
 * GET DYNAMIC DATA
 * ====================== */
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
      if (!id) { out[id] = null; continue; }

      let query = {};
      if (ObjectId.isValid(String(id))) query = { _id: new ObjectId(String(id)) };
      else query = { _id: String(id) };

      const doc = await db.collection(collection).findOne(query);
      let name = null;

      if (doc) {
        if (type === 'cities') name = doc.name || doc.city || doc.cityName || doc.city_name || null;
        else if (type === 'flights') name = doc.flight_number || doc.name || doc.flightNumber || doc.flight_name
                                        || (doc.airline ? `${doc.airline} ${doc.flight_number || doc.flightNumber || ''}`.trim() : null);
        else if (type === 'hotels') name = doc.name || doc.hotel_name || doc.hotelName || null;
      }

      out[id] = doc ? { ...doc, __resolvedName: name || `Unknown ${type.slice(0, -1)}` } : { _id: id, __resolvedName: `Unknown ${type.slice(0, -1)}` };
    }

    return res.json({ success: true, data: out });
  } catch (err) {
    console.error('getDynamicData error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/** ======================
 * GET ORDERS FOR PROFILE
 * Cleaned version with resolved names
 * ====================== */
export async function getOrdersForProfile(req, res) {
  try {
    const uid = req.user?.id || req.user?.userId;
    const userObjectId = toObjectId(uid);
    if (!userObjectId) return res.status(400).json({ message: 'Invalid user ID' });

    const db = await connectDB();

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },

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

          departure_city_name: { $ifNull: ['$departureCity.name', { $ifNull: ['$departureCity.city', { $toString: '$departure_city_id' }] }] },
          destination_city_name: { $ifNull: ['$destinationCity.name', { $ifNull: ['$destinationCity.city', { $toString: '$destination_city_id' }] }] },
          flight_name: {
            $ifNull: [
              '$flight.flight_number',
              { $ifNull: [
                '$flight.name',
                { $ifNull: [
                  '$flight.flightNumber',
                  { $cond: [
                      { $gt: [{ $type: '$flight.airline' }, 'missing'] },
                      { $concat: ['$flight.airline', ' ', { $ifNull: ['$flight.flight_number', '$flight.flightNumber'] }] },
                      { $toString: '$flight_id' }
                    ]
                  }
                ]}
              ]}
            ]
          },
          hotel_name: { $ifNull: ['$hotel.name', { $ifNull: ['$hotel.hotel_name', { $ifNull: ['$hotel.hotelName', { $toString: '$hotel_id' }] }] }] }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    // Convert all IDs to strings for React Native
    const safeOrders = orders.map(o => ({
      ...o,
      _id: o._id?.toString(),
      user_id: o.user_id?.toString(),
      departure_city_id: o.departure_city_id?.toString(),
      destination_city_id: o.destination_city_id?.toString(),
      flight_id: o.flight_id?.toString(),
      hotel_id: o.hotel_id?.toString(),
      attractions: Array.isArray(o.attractions) ? o.attractions.map(a => a?.toString?.() || a) : []
    }));

    return res.status(200).json({ success: true, orders: safeOrders });
  } catch (err) {
    console.error('getOrdersForProfile error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

/** ======================
 * GET USER ORDERS
 * Aggregate with lookups and fallbacks
 * ====================== */
export async function getUserOrders(req, res) {
  if (!req.user?.id && !req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id || req.user.userId;
    const userObjectId = toObjectId(userId);
    if (!userObjectId) return res.status(400).json({ message: 'Invalid user ID' });

    const db = await connectDB();

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },

      // DEPARTURE CITY
      { $lookup: { from: 'city', localField: 'departure_city_id', foreignField: '_id', as: 'departureCity' } },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },

      // DESTINATION CITY
      { $lookup: { from: 'city', localField: 'destination_city_id', foreignField: '_id', as: 'destinationCity' } },
      { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },

      // FLIGHT
      { $lookup: { from: 'flights', localField: 'flight_id', foreignField: '_id', as: 'flight' } },
      { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },

      // HOTEL
      { $lookup: { from: 'hotels', localField: 'hotel_id', foreignField: '_id', as: 'hotel' } },
      { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },

      // PROJECT WITH FALLBACKS
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
          departure_city_name: { $ifNull: ['$departureCity.name', { $ifNull: ['$departureCity.city', { $toString: '$departure_city_id' }] }] },
          destination_city_name: { $ifNull: ['$destinationCity.name', { $ifNull: ['$destinationCity.city', { $toString: '$destination_city_id' }] }] },
          flight_name: {
            $ifNull: ['$flight.flight_number', { $ifNull: ['$flight.name', { $ifNull: ['$flight.flightNumber', { $toString: '$flight_id' }] }] }]
          },
          hotel_name: { $ifNull: ['$hotel.name', { $ifNull: ['$hotel.hotel_name', { $ifNull: ['$hotel.hotelName', { $toString: '$hotel_id' }] }] }] }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('getUserOrders error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
export async function createOrder(req, res) {
  try {
    const db = await connectDB();
    const userId = req.user.id || req.user.userId;
    if (!userId) return res.status(400).json({ message: 'Invalid user ID' });

    const orderData = {
      ...req.body,
      user_id: new ObjectId(userId),
      created_at: new Date()
    };

    const result = await db.collection('orders').insertOne(orderData);
    res.status(201).json({ success: true, orderId: result.insertedId });
  } catch (err) {
    console.error('createOrder error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
