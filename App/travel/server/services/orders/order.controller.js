// order.controller.js
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

/** Small helper */
const toObjectId = (v) => (ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
export async function getDynamicData(req, res) {
  try {
    const { type, ids = [] } = req.body || {};
    const validTypes = { cities: 'cities', flights: 'flights', hotels: 'hotels' };
    if (!validTypes[type]) {
      return res.status(400).json({ message: 'Invalid type' });
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const db = await connectDB();
    const col = db.collection(validTypes[type]);

    // Split incoming ids into ObjectIds and strings so we can match both schemas
    const asObjectIds = [];
    const asStrings = [];
    for (const id of ids) {
      const s = String(id);
      if (/^[0-9a-f]{24}$/i.test(s)) {
        try { asObjectIds.push(new ObjectId(s)); } catch {}
      }
      asStrings.push(s);
    }

    const docs = await col.find({
      $or: [
        { _id: { $in: asObjectIds } },       // collections that use ObjectId _id
        { _id: { $in: asStrings } },         // collections that use string _id
      ],
    }).toArray();

    // Normalize a friendly name per type
    const data = {};
    for (const d of docs) {
      const key = String(d._id);
      let name = null;
      if (type === 'cities') {
        name = d.name || d.city || d.cityName || d.city_name || null;
      } else if (type === 'flights') {
        name = d.flight_number || d.name || d.flightNumber || d.flight_name
             || (d.airline ? `${d.airline} ${d.flight_number || d.flightNumber || ''}`.trim() : null);
      } else if (type === 'hotels') {
        name = d.name || d.hotel_name || d.hotelName || null;
      }
      data[key] = { ...d, __resolvedName: name };
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('getDynamicData error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
/** Orders for Profile.jsx (clean, no attraction formatting) */
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