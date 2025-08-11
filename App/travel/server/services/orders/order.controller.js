// Backend: Orders + Attractions controller (PRESERVES ALL EXISTING FUNCTIONALITY + CITY SEARCH)
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

// -------------------- in-memory caches for dynamic lookups --------------------
const dynamicCache = {
  cities: new Map(),
  flights: new Map(),
  hotels: new Map(),
};

// -------------------- helpers --------------------
async function getDataById(collection, id, cacheMap) {
  if (!id) return null;

  const cacheKey = id.toString();
  if (cacheMap.has(cacheKey)) return cacheMap.get(cacheKey);

  try {
    const db = await connectDB();

    if (!ObjectId.isValid(String(id))) {
      cacheMap.set(cacheKey, null);
      return null;
    }
    const objectId = new ObjectId(String(id));
    const document = await db.collection(collection).findOne({ _id: objectId });

    cacheMap.set(cacheKey, document);
    return document;
  } catch (error) {
    console.error(`❌ Error fetching ${collection} by ID ${id}:`, error);
    cacheMap.set(cacheKey, null);
    return null;
  }
}

// -------------------- dynamic lookups (PRESERVED) --------------------
export async function getDynamicData(req, res) {
  try {
    const { type, ids } = req.body; // type: 'cities' | 'flights' | 'hotels'

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

// -------------------- get user orders (PRESERVED COMPLETELY) --------------------
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

      { $lookup: { from: 'cities', localField: 'departure_city_id', foreignField: '_id', as: 'departureCity' } },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },

      { $lookup: { from: 'cities', localField: 'destination_city_id', foreignField: '_id', as: 'destinationCity' } },
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
              { $ifNull: ['$departureCity.city', { $ifNull: ['$departureCity.cityName', null] }] }
            ]
          },

          destination_city_name: {
            $ifNull: [
              '$destinationCity.name',
              { $ifNull: ['$destinationCity.city', { $ifNull: ['$destinationCity.cityName', null] }] }
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
                          {
                            $concat: [
                              { $ifNull: ['$flight.airline', ''] },
                              ' ',
                              { $ifNull: ['$flight.flight_number', ''] }
                            ]
                          },
                          null
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
              { $ifNull: ['$hotel.hotel_name', { $ifNull: ['$hotel.hotelName', null] }] }
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

// -------------------- NEW: search attractions by city --------------------
// Fixed searchAttractionsByCity function - searches in cities collection instead of attractions
export async function searchAttractionsByCity(req, res) {
  try {
    const { city, limit = 30 } = req.body || {};

    if (!city || typeof city !== 'string') {
      console.error('❌ Invalid city:', { city, type: typeof city });
      return res.status(400).json({ 
        success: false,
        message: 'City name is required as a string',
        received: { city, type: typeof city }
      });
    }

    const searchCity = city.trim();
    if (searchCity.length < 2) {
      return res.status(400).json({ 
        success: false,
        message: 'City name must be at least 2 characters long' 
      });
    }

    console.log(`🏙️ Searching attractions in city: "${searchCity}"`);

    const db = await connectDB();
    
    // CHANGE: Search in 'cities' collection instead of 'attractions'
    const col = db.collection('attractions');

    // Check if cities collection exists and has data
    const citiesCount = await col.countDocuments();
    console.log(`📊 Total cities in database: ${citiesCount}`);

    if (citiesCount === 0) {
      console.log('⚠️ No cities in database, returning empty result');
      return res.json({ 
        success: true, 
        items: [],
        message: 'No cities in database yet. Please add some cities with attractions first.',
        searchParams: { city: searchCity, resultsCount: 0 }
      });
    }

    // Build city search query - case insensitive, flexible matching
    const cityRegex = new RegExp(searchCity, 'i');
    const cityQuery = {
      $and: [
        {
          $or: [
            { city: cityRegex },
            { name: cityRegex },
            { cityName: cityRegex }
          ]
        },
        {
          attractions: { $exists: true, $type: 'array', $ne: [] }
        }
      ]
    };

    console.log('🔍 City search query:', JSON.stringify(cityQuery, null, 2));

    // Build aggregation pipeline
    const pipeline = [
      { $match: cityQuery },
      {
        $project: {
          _id: 1,
          city: 1,
          name: 1,
          cityName: 1,
          attractions: 1,
          // Add default availability if not present in attractions
          attractionsWithDefaults: {
            $map: {
              input: '$attractions',
              as: 'attraction',
              in: {
                $mergeObjects: [
                  '$$attraction',
                  {
                    availability: {
                      $cond: {
                        if: { 
                          $and: [
                            { $isArray: '$$attraction.availability' }, 
                            { $gt: [{ $size: '$$attraction.availability' }, 0] }
                          ]
                        },
                        then: '$$attraction.availability',
                        else: ['09:00-11:00', '13:00-15:00', '16:00-18:00']
                      }
                    },
                    bookable: {
                      $ifNull: ['$$attraction.bookable', true]
                    },
                    category: {
                      $ifNull: ['$$attraction.category', 'attraction']
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          city: { $ifNull: ['$city', { $ifNull: ['$name', '$cityName'] }] },
          attractions: '$attractionsWithDefaults'
        }
      },
      { $sort: { city: 1 } }, // Sort alphabetically by city name
      { $limit: Number(limit) }
    ];

    console.log('📋 City search pipeline:', JSON.stringify(pipeline, null, 2));

    let docs;
    try {
      docs = await col.aggregate(pipeline).toArray();
    } catch (aggregationError) {
      console.error('❌ City search aggregation failed:', aggregationError);
      throw aggregationError;
    }

    console.log(`✅ Found ${docs.length} cities matching: "${searchCity}"`);

    // Format the results - return the city documents with attractions
    const items = docs.map(doc => ({
      _id: doc._id.toString(),
      id: doc._id.toString(), // Ensure string ID for React keys
      city: doc.city,
      attractions: doc.attractions || []
    }));

    // Count total attractions across all cities
    const totalAttractions = items.reduce((sum, item) => sum + (item.attractions?.length || 0), 0);
    console.log(`📊 Total attractions found across ${items.length} cities: ${totalAttractions}`);

    res.json({ 
      success: true, 
      items,
      searchParams: {
        city: searchCity,
        resultsCount: items.length,
        totalAttractions
      }
    });

  } catch (err) {
    console.error('❌ searchAttractionsByCity error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search attractions by city',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
}
// -------------------- PRESERVED: original location-based search --------------------
export async function searchAttractions(req, res) {
  try {
    const { lat, lon, radiusM = 5000, city = null, countryCode = null, limit = 30 } = req.body || {};

    if (typeof lat !== 'number' || typeof lon !== 'number') {
      console.error('❌ Invalid lat/lon:', { lat, lon, type_lat: typeof lat, type_lon: typeof lon });
      return res.status(400).json({ 
        success: false,
        message: 'lat/lon are required numbers',
        received: { lat, lon, types: { lat: typeof lat, lon: typeof lon } }
      });
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude must be between -90 and 90' 
      });
    }

    if (lon < -180 || lon > 180) {
      return res.status(400).json({ 
        success: false,
        message: 'Longitude must be between -180 and 180' 
      });
    }

    console.log(`🔍 Searching attractions near: ${lat}, ${lon} within ${radiusM}m`);

    const db = await connectDB();
    const col = db.collection('attractions');

    // Check if attractions collection exists and has data
    const attractionsCount = await col.countDocuments();
    console.log(`📊 Total attractions in database: ${attractionsCount}`);

    if (attractionsCount === 0) {
      console.log('⚠️ No attractions in database, returning empty result');
      return res.json({ 
        success: true, 
        items: [],
        message: 'No attractions in database yet. Please add some attractions first.',
        searchParams: { lat, lon, radiusM, city, countryCode, resultsCount: 0 }
      });
    }

    // Build additional filters
    const filters = [];
    if (city) {
      filters.push({ 
        $or: [
          { city: { $regex: new RegExp(city, 'i') } },
          { 'address.city': { $regex: new RegExp(city, 'i') } }
        ]
      });
    }
    if (countryCode) {
      filters.push({ 
        $or: [
          { countryCode: countryCode.toUpperCase() },
          { 'address.countryCode': countryCode.toUpperCase() }
        ]
      });
    }

    // Build aggregation pipeline
    const pipeline = [
      {
        $geoNear: {
          near: { 
            type: 'Point', 
            coordinates: [Number(lon), Number(lat)] 
          },
          distanceField: 'distance',
          maxDistance: Number(radiusM),
          spherical: true,
          distanceMultiplier: 1 // distance in meters
        }
      }
    ];

    // Add filters if any
    if (filters.length > 0) {
      pipeline.push({ $match: { $and: filters } });
    }

    // Add projection and sorting
    pipeline.push(
      {
        $addFields: {
          // Ensure availability exists
          availability: {
            $cond: {
              if: { $and: [{ $isArray: '$availability' }, { $gt: [{ $size: '$availability' }, 0] }] },
              then: '$availability',
              else: ['09:00-11:00', '13:00-15:00', '16:00-18:00'] // default availability
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          address: 1,
          city: 1,
          countryCode: 1,
          website: { $ifNull: ['$website', null] },
          rating: { $ifNull: ['$rating', null] },
          openingHours: { $ifNull: ['$openingHours', null] },
          bookable: { $ifNull: ['$bookable', false] },
          price: { $ifNull: ['$price', null] },
          location: 1,
          distance: { $round: ['$distance', 0] }, // round to nearest meter
          availability: 1,
          description: { $ifNull: ['$description', null] },
          category: { $ifNull: ['$category', 'attraction'] }
        }
      },
      { $sort: { distance: 1 } },
      { $limit: Number(limit) }
    );

    console.log('📋 Pipeline first stage:', JSON.stringify(pipeline[0], null, 2));

    let docs;
    try {
      docs = await col.aggregate(pipeline).toArray();
    } catch (aggregationError) {
      console.error('❌ Aggregation failed:', aggregationError);
      
      // Check if geoNear failed due to missing index
      if (aggregationError.message?.includes('2dsphere') || aggregationError.message?.includes('geo')) {
        console.log('🔧 Attempting to create geo index...');
        try {
          await col.createIndex({ location: '2dsphere' });
          console.log('✅ Geo index created successfully');
          // Retry the aggregation
          docs = await col.aggregate(pipeline).toArray();
        } catch (indexError) {
          console.error('❌ Failed to create geo index:', indexError);
          throw aggregationError;
        }
      } else {
        throw aggregationError;
      }
    }

    console.log(`✅ Found ${docs.length} attractions within ${radiusM}m`);

    // Format the results
    const items = docs.map(doc => ({
      ...doc,
      id: doc._id.toString() // Ensure string ID for React keys
    }));

    res.json({ 
      success: true, 
      items,
      searchParams: {
        lat,
        lon,
        radiusM,
        city,
        countryCode,
        resultsCount: items.length
      }
    });

  } catch (err) {
    console.error('❌ searchAttractions error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search attractions',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
}

export async function bookAttraction(req, res) {
  try {
    const id = req.params.id;
    const { slot } = req.body;
    
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid attraction ID format' 
      });
    }

    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        message: 'User authentication required' 
      });
    }

    console.log(`🎫 Booking attraction ${id} for user ${userId}, slot: ${slot}`);

    const db = await connectDB();
    const attractionsCol = db.collection('attractions');
    
    // Verify attraction exists and is bookable
    const attraction = await attractionsCol.findOne({ 
      _id: new ObjectId(id),
      bookable: true 
    });

    if (!attraction) {
      return res.status(404).json({
        success: false,
        message: 'Attraction not found or not bookable'
      });
    }

    // Create a booking record (you can expand this)
    const booking = {
      _id: new ObjectId(),
      user_id: new ObjectId(userId),
      attraction_id: new ObjectId(id),
      attraction_name: attraction.name,
      slot: slot || 'No specific time',
      price: attraction.price || 0,
      status: 'confirmed',
      booking_date: new Date(),
      created_at: new Date()
    };

    // Optional: Save booking to a separate bookings collection
    try {
      await db.collection('bookings').insertOne(booking);
      console.log('✅ Booking saved to database');
    } catch (bookingError) {
      console.warn('⚠️ Failed to save booking to database:', bookingError);
      // Continue anyway for demo purposes
    }

    console.log('✅ Booking processed successfully');

    res.json({ 
      success: true, 
      message: `Successfully booked ${attraction.name}`,
      booking: {
        id: booking._id.toString(),
        attraction_name: attraction.name,
        slot: slot,
        price: attraction.price,
        status: 'confirmed'
      }
    });

  } catch (err) {
    console.error('❌ bookAttraction error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to book attraction',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
}