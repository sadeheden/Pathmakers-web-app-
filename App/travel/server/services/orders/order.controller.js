import Order from './order.model.js';
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';

function cleanId(id) {
  try {
    if (!id) return null;
    return new ObjectId(String(id));
  } catch (error) {
    console.warn('⚠️ Invalid ObjectId:', id, error.message);
    return null;
  }
}

function toObjectId(id) {
  try {
    if (!id) return null;
    return new ObjectId(String(id));
  } catch (err) {
    console.warn('⚠️ Invalid ObjectId:', id);
    return null;
  }
}

export async function createOrder(req, res) {
  console.log('📬 Creating new order for user:', req.user?.id || req.user?.userId);
  console.log('📬 Request body:', JSON.stringify(req.body, null, 2));

  if (!req.user?.id && !req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const {
      departureCityId,
      destinationCityId,
      flightId,              // may be missing
      hotelId,
      attractions,
      transportation,
      paymentMethod,
      totalPrice,
    } = req.body;

    // First pass validation (everything except flightId, which we may resolve)
    const missing = [];
    if (!departureCityId) missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!hotelId) missing.push('hotelId');
    if (!paymentMethod) missing.push('paymentMethod');
    if (totalPrice === undefined || totalPrice === null || totalPrice === '') {
      missing.push('totalPrice');
    }
    if (missing.length) {
      console.log('❌ Missing fields:', missing);
      return res.status(400).json({
        message: `Missing required fields: ${missing.join(', ')}`,
        received: req.body
      });
    }

    // 🔎 If flightId is absent, try to resolve it from DB by destination
    const { finalFlightId } = await resolveFlightIdIfMissing({ flightId, destinationCityId });
    if (!finalFlightId) {
      return res.status(400).json({
        message: 'Missing required fields: flightId',
        received: req.body
      });
    }

    // Convert and validate ObjectIds
    const cleanId = (id) => {
      try { return id ? new ObjectId(String(id)) : null; } catch { return null; }
    };

    const userId = cleanId(req.user.id || req.user.userId);
    const departureCityObjectId = cleanId(departureCityId);
    const destinationCityObjectId = cleanId(destinationCityId);
    const flightObjectId = cleanId(finalFlightId);
    const hotelObjectId = cleanId(hotelId);

    if (!userId) return res.status(400).json({ message: 'Invalid user ID' });
    if (!departureCityObjectId) return res.status(400).json({ message: 'Invalid departure city ID' });
    if (!destinationCityObjectId) return res.status(400).json({ message: 'Invalid destination city ID' });
    if (!flightObjectId) return res.status(400).json({ message: 'Invalid flight ID' });
    if (!hotelObjectId) return res.status(400).json({ message: 'Invalid hotel ID' });

    // Process attractions
    const attractionIds = Array.isArray(attractions)
      ? attractions.map(cleanId).filter(Boolean)
      : [];

    // Parse total price
    const parsedTotalPrice = parseInt(totalPrice) || parseFloat(totalPrice) || 0;
    if (parsedTotalPrice <= 0) {
      return res.status(400).json({ message: 'Invalid total price' });
    }

    console.log('✅ Validation passed, creating order with:', {
      user_id: userId,
      departure_city_id: departureCityObjectId,
      destination_city_id: destinationCityObjectId,
      flight_id: flightObjectId,
      hotel_id: hotelObjectId,
      attractions: attractionIds,
      transportation,
      payment_method: paymentMethod,
      total_price: parsedTotalPrice,
    });

    // Create order with pre-validated ObjectIds
    const orderData = {
      user_id: userId,
      departure_city_id: departureCityObjectId,
      destination_city_id: destinationCityObjectId,
      flight_id: flightObjectId,
      hotel_id: hotelObjectId,
      attractions: attractionIds,
      transportation,
      payment_method: paymentMethod,
      total_price: parsedTotalPrice,
      created_at: new Date(),
    };

    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    console.log('✅ Order saved successfully:', savedOrder._id);
    return res.status(201).json(savedOrder);

  } catch (err) {
    console.error('❌ Create order error:', err);
    console.error('Stack trace:', err.stack);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

// תיקון פונקציית getUserOrders ב order.controller.js
// Try to find a flight if client didn't send one
async function resolveFlightIdIfMissing({ flightId, destinationCityId }) {
  if (flightId) return { finalFlightId: flightId, flightNameFromDb: null };

  const db = await connectDB();
  const toId = (v) => {
    try { return v ? new ObjectId(String(v)) : null; } catch { return null; }
  };
  const destId = toId(destinationCityId) || destinationCityId || null;

  let flightDoc = null;
  if (destId) {
    flightDoc = await db.collection('flights').findOne({
      $or: [
        { destination_city_id: destId },
        { destination: destId },
        { 'route.to': destId },
      ],
    });
  }
  if (!flightDoc) {
    // fallback: any flight so the order can save
    flightDoc = await db.collection('flights').findOne({});
  }
  if (!flightDoc?._id) {
    return { finalFlightId: null, flightNameFromDb: null };
  }
  const name =
    flightDoc.name ||
    flightDoc.title ||
    flightDoc.flight_number ||
    flightDoc.flightNumber ||
    flightDoc.airline ||
    '';
  return { finalFlightId: String(flightDoc._id), flightNameFromDb: name };
}

export async function getUserOrders(req, res) {
  if (!req.user?.id && !req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user.id || req.user.userId;
    const userObjectId = toObjectId(userId);
    
    if (!userObjectId) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const db = await connectDB();

    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: userObjectId } },
      
      {
        $lookup: {
          from: 'cities',
          localField: 'departure_city_id',
          foreignField: '_id',
          as: 'departureCity'
        }
      },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },
      
      {
        $lookup: {
          from: 'cities',
          localField: 'destination_city_id',
          foreignField: '_id',
          as: 'destinationCity'
        }
      },
      { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },
      
      {
        $lookup: {
          from: 'flights',
          localField: 'flight_id',
          foreignField: '_id',
          as: 'flight'
        }
      },
      { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },
      
      {
        $lookup: {
          from: 'hotels',
          localField: 'hotel_id',
          foreignField: '_id',
          as: 'hotel'
        }
      },
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
              { $ifNull: ['$departureCity.city', { $toString: '$departure_city_id' }] }
            ]
          },
          destination_city_name: {
            $ifNull: [
              '$destinationCity.name',
              { $ifNull: ['$destinationCity.city', { $toString: '$destination_city_id' }] }
            ]
          },
          flight_name: {
            $ifNull: [
              '$flight.flight_number',
              { $ifNull: ['$flight.name', { $ifNull: ['$flight.airline', { $toString: '$flight_id' }] }] }
            ]
          },
          hotel_name: {
            $ifNull: [
              '$hotel.name',
              { $ifNull: ['$hotel.hotel_name', { $toString: '$hotel_id' }] }
            ]
          }
        }
      },
      { $sort: { created_at: -1 } }
    ]).toArray();

    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    console.log('📊 Sample order with lookups:', JSON.stringify(orders[0], null, 2));
    
    return res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error('❌ Get orders error:', err);
    return res.status(500).json({ 
      message: 'Internal Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}