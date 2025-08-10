// Backend: Enhanced controller with dynamic lookup endpoint
import Order from './order.model.js';
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

// Cache for dynamic lookups to avoid repeated DB calls
const dynamicCache = {
  cities: new Map(),
  flights: new Map(),
  hotels: new Map(),
};

// Helper function to get data by ID with caching
async function getDataById(collection, id, cacheMap) {
  if (!id) return null;
  
  // Check cache first
  const cacheKey = id.toString();
  if (cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }
  
  try {
    const db = await connectDB();
    const objectId = new ObjectId(id);
    const document = await db.collection(collection).findOne({ _id: objectId });
    
    // Cache the result (even if null)
    cacheMap.set(cacheKey, document);
    return document;
  } catch (error) {
    console.error(`❌ Error fetching ${collection} by ID ${id}:`, error);
    cacheMap.set(cacheKey, null);
    return null;
  }
}

// New endpoint for dynamic lookups
export async function getDynamicData(req, res) {
  try {
    const { type, ids } = req.body; // type: 'cities', 'flights', 'hotels', ids: array of IDs
    
    if (!type || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'Invalid request. Need type and ids array.' });
    }
    
    const validTypes = ['cities', 'flights', 'hotels'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be cities, flights, or hotels.' });
    }
    
    const results = {};
    const cacheMap = dynamicCache[type];
    
    for (const id of ids) {
      if (id) {
        const data = await getDataById(type, id, cacheMap);
        results[id] = data;
      }
    }
    
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('❌ Dynamic lookup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Enhanced getUserOrders with better fallback
export async function getUserOrders(req, res) {
  if (!req.user?.id && !req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user.id || req.user.userId;
    const userObjectId = new ObjectId(userId);
    
    const db = await connectDB();

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },
      
      // Lookup departure city
      {
        $lookup: {
          from: 'cities',
          localField: 'departure_city_id',
          foreignField: '_id',
          as: 'departureCity'
        }
      },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },
      
      // Lookup destination city
      {
        $lookup: {
          from: 'cities',
          localField: 'destination_city_id',
          foreignField: '_id',
          as: 'destinationCity'
        }
      },
      { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },
      
      // Lookup flight
      {
        $lookup: {
          from: 'flights',
          localField: 'flight_id',
          foreignField: '_id',
          as: 'flight'
        }
      },
      { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },
      
      // Lookup hotel
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotel_id',
          foreignField: '_id',
          as: 'hotel'
        }
      },
      { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },
      
      // Enhanced projection
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

          // Return both the looked up data AND the IDs for fallback
          departure_city_name: {
            $ifNull: [
              '$departureCity.name',
              {
                $ifNull: [
                  '$departureCity.city',
                  {
                    $ifNull: [
                      '$departureCity.cityName',
                      null // Will trigger dynamic lookup on frontend
                    ]
                  }
                ]
              }
            ]
          },

          destination_city_name: {
            $ifNull: [
              '$destinationCity.name',
              {
                $ifNull: [
                  '$destinationCity.city',
                  {
                    $ifNull: [
                      '$destinationCity.cityName',
                      null // Will trigger dynamic lookup on frontend
                    ]
                  }
                ]
              }
            ]
          },

          flight_name: {
            $ifNull: [
              '$flight.flight_number',
              {
                $ifNull: [
                  '$flight.name',
                  {
                    $ifNull: [
                      '$flight.flightNumber',
                      {
                        $ifNull: [
                          { $concat: [
                            { $ifNull: ['$flight.airline', ''] },
                            ' ',
                            { $ifNull: ['$flight.flight_number', ''] }
                          ]},
                          null // Will trigger dynamic lookup on frontend
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },

          hotel_name: {
            $ifNull: [
              '$hotel.name',
              {
                $ifNull: [
                  '$hotel.hotel_name',
                  {
                    $ifNull: [
                      '$hotel.hotelName',
                      null // Will trigger dynamic lookup on frontend
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('❌ Get orders error:', err);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}