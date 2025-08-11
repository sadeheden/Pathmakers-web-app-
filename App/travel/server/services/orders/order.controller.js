// controllers/orders.controller.js
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

/** Helpers */
const toObjectId = (v) => {
  try {
    if (!v) return null;
    const str = String(v).trim();
    return ObjectId.isValid(str) ? new ObjectId(str) : null;
  } catch (error) {
    console.error('Error converting to ObjectId:', v, error);
    return null;
  }
};

const reqUserId = (req) => {
  const userId = req.user?.id || req.user?.userId || req.user?._id;
  console.log('🔍 Extracted user ID from request:', userId);
  return userId;
};

/** ========= CREATE ORDER =========
 * Expects camelCase fields from RN and stores snake_case in Mongo.
 * Path: POST /api/orders
 */
export async function createOrder(req, res) {
  try {
    console.log('🚀 CREATE ORDER - Starting process');
    console.log('📨 Request body:', JSON.stringify(req.body, null, 2));
    console.log('👤 Request user:', req.user);

    const uid = reqUserId(req);
    const userObjectId = toObjectId(uid);
    
    if (!userObjectId) {
      console.error('❌ Invalid user ID:', uid);
      return res.status(401).json({ message: 'Unauthorized - invalid user ID in token' });
    }

    console.log('✅ Valid user ObjectId:', userObjectId);

    // Extract required fields
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

    // Basic validation with detailed logging
    const missing = [];
    if (!departureCityId) { missing.push('departureCityId'); console.log('❌ Missing: departureCityId'); }
    if (!departureCityName) { missing.push('departureCityName'); console.log('❌ Missing: departureCityName'); }
    if (!destinationCityId) { missing.push('destinationCityId'); console.log('❌ Missing: destinationCityId'); }
    if (!destinationCityName) { missing.push('destinationCityName'); console.log('❌ Missing: destinationCityName'); }
    if (!flightId) { missing.push('flightId'); console.log('❌ Missing: flightId'); }
    if (totalPrice === undefined || totalPrice === null) { missing.push('totalPrice'); console.log('❌ Missing: totalPrice'); }
    
    if (missing.length) {
      console.error('❌ Validation failed - missing fields:', missing);
      return res.status(400).json({ message: `Missing required field(s): ${missing.join(', ')}` });
    }

    console.log('✅ All required fields present');

    // Convert to MongoDB schema with proper ObjectId handling
    const doc = {
      user_id: userObjectId,
      
      departure_city_id: toObjectId(departureCityId) || departureCityId,
      departure_city_name: String(departureCityName),
      
      destination_city_id: toObjectId(destinationCityId) || destinationCityId,
      destination_city_name: String(destinationCityName),
      
      flight_id: toObjectId(flightId) || flightId,
      flight_name: String(flightName || ''),
      
      hotel_id: hotelId ? (toObjectId(hotelId) || hotelId) : null,
      hotel_name: String(hotelName || ''),
      
      attractions: Array.isArray(attractions)
        ? attractions.map((a) => toObjectId(a) || String(a)).filter(Boolean)
        : [],
      
      transportation: String(transportation || ''),
      payment_method: String(paymentMethod || ''),
      total_price: Number(totalPrice) || 0,
      
      status: 'confirmed',
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log('📄 Document prepared for insertion:', JSON.stringify(doc, null, 2));

    // Connect to database and insert
    const db = await connectDB();
    console.log('🔌 Database connected successfully');
    
    const result = await db.collection('orders').insertOne(doc);
    console.log('✅ Insert result:', result);

    if (!result.insertedId) {
      throw new Error('Failed to insert order - no insertedId returned');
    }

    // Prepare response
    const response = {
      _id: result.insertedId,
      ...doc,
      // Add string versions for RN convenience
      _id_str: result.insertedId.toString(),
      user_id_str: doc.user_id?.toString(),
      departure_city_id_str: doc.departure_city_id?.toString?.() || doc.departure_city_id,
      destination_city_id_str: doc.destination_city_id?.toString?.() || doc.destination_city_id,
      flight_id_str: doc.flight_id?.toString?.() || doc.flight_id,
      hotel_id_str: doc.hotel_id?.toString?.() || doc.hotel_id,
    };

    console.log('✅ Order created successfully:', response._id);
    return res.status(201).json(response);

  } catch (e) {
    console.error('❌ CREATE ORDER ERROR:', e);
    console.error('Stack:', e.stack);
    return res.status(500).json({ 
      message: 'Failed to create order', 
      error: process.env.NODE_ENV === 'development' ? e.message : 'Internal server error'
    });
  }
}

/** ========= PROFILE ORDERS (updated with better error handling) =========
 * Orders for Profile.jsx (clean, no attraction formatting)
 */
export async function getOrdersForProfile(req, res) {
  try {
    console.log('🔍 GET ORDERS FOR PROFILE - Starting');
    console.log('👤 Request user:', req.user);

    const uid = reqUserId(req);
    const userObjectId = toObjectId(uid);
    
    if (!userObjectId) {
      console.error('❌ Invalid user ID for profile orders:', uid);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    console.log('✅ Fetching orders for user:', userObjectId);

    const db = await connectDB();
    console.log('🔌 Database connected for orders fetch');

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },

      // Lookup collections
      { $lookup: { from: 'city', localField: 'departure_city_id', foreignField: '_id', as: 'departureCity' } },
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
          status: 1,
          created_at: 1,
          updated_at: 1,

          departure_city_name: {
            $ifNull: [
              '$departureCity.name',
              { $ifNull: ['$departureCity.city', { $ifNull: ['$departureCity.cityName', '$departure_city_name'] }] }
            ]
          },
          destination_city_name: {
            $ifNull: [
              '$destinationCity.name',
              { $ifNull: ['$destinationCity.city', { $ifNull: ['$destinationCity.cityName', '$destination_city_name'] }] }
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
                      { $and: [
                        { $ifNull: ['$flight.airline', false] },
                        { $ifNull: ['$flight.flight_number', false] }
                      ]},
                      { $trim: { input: { $concat: [
                        { $ifNull: ['$flight.airline', ''] }, 
                        ' ', 
                        { $ifNull: ['$flight.flight_number', ''] }
                      ]}}},
                      '$flight_name'
                    ]
                  }
                ]}
              ]}
            ]
          },
          hotel_name: {
            $ifNull: [
              '$hotel.name',
              { $ifNull: ['$hotel.hotel_name', { $ifNull: ['$hotel.hotelName', '$hotel_name'] }] }
            ]
          }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    console.log(`✅ Found ${orders.length} orders for user`);

    // Convert ObjectIds to strings for React Native
    const safeOrders = orders.map(order => ({
      ...order,
      _id: order._id?.toString(),
      user_id: order.user_id?.toString(),
      departure_city_id: order.departure_city_id?.toString(),
      destination_city_id: order.destination_city_id?.toString(),
      flight_id: order.flight_id?.toString(),
      hotel_id: order.hotel_id?.toString(),
      attractions: Array.isArray(order.attractions) 
        ? order.attractions.map(a => a?.toString?.() || a) 
        : []
    }));

    console.log('📦 Returning orders:', safeOrders.length);
    return res.status(200).json({ success: true, orders: safeOrders });

  } catch (err) {
    console.error('❌ GET ORDERS FOR PROFILE ERROR:', err);
    console.error('Stack:', err.stack);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Failed to fetch orders'
    });
  }
}

const COLLECTIONS = { cities: 'city', flights: 'flights', hotels: 'hotels' };

export async function getDynamicData(req, res) {
  try {
    console.log('🔍 GET DYNAMIC DATA - Starting');
    console.log('📨 Request body:', req.body);

    const { type, ids } = req.body;
    if (!type || !Array.isArray(ids)) {
      console.error('❌ Invalid request - missing type or ids not array');
      return res.status(400).json({ message: 'Invalid request: type and ids array required' });
    }

    const collection = COLLECTIONS[type];
    if (!collection) {
      console.error('❌ Invalid collection type:', type);
      return res.status(400).json({ message: `Invalid type: ${type}` });
    }

    console.log(`✅ Fetching ${type} from collection: ${collection}`);

    const db = await connectDB();
    const result = {};
    
    for (const id of ids) {
      if (!id) {
        result[id] = null;
        continue;
      }
      
      const objectId = toObjectId(id);
      if (!objectId) {
        console.log(`⚠️ Invalid ObjectId: ${id}`);
        result[id] = null;
        continue;
      }
      
      try {
        const doc = await db.collection(collection).findOne({ _id: objectId });
        result[id] = doc || null;
        console.log(`${doc ? '✅' : '❌'} Found document for ${id}:`, doc ? 'Yes' : 'No');
      } catch (error) {
        console.error(`❌ Error fetching ${id}:`, error);
        result[id] = null;
      }
    }
    
    console.log('📦 Dynamic data result:', Object.keys(result).length, 'items');
    res.json({ success: true, data: result });
    
  } catch (e) {
    console.error('❌ GET DYNAMIC DATA ERROR:', e);
    console.error('Stack:', e.stack);
    res.status(500).json({ 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? e.message : 'Failed to fetch dynamic data'
    });
  }
}