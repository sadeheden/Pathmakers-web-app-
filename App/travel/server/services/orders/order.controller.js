import Order from './order.model.js';
import { ObjectId } from 'mongodb';
import { connectDB } from '../auth/auth.db.js';


function cleanId(id) {
  try {
    return new ObjectId(String(id)); // ✅ always ensure it's a string
  } catch {
    return null;
  }
}


export async function createOrder(req, res) {
    console.log('📬 incoming departureCityId:', req.body.departureCityId);
  console.log('📬 incoming destinationCityId:', req.body.destinationCityId);
  if (!req.user?.id && !req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const {
      departureCityId,
      destinationCityId,
      flightId,
      hotelId,
      attractions,
      transportation,
      paymentMethod,
      totalPrice,
    } = req.body;

    const missing = [];
    if (!departureCityId) missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!flightId) missing.push('flightId');
    if (!hotelId) missing.push('hotelId');
    if (!paymentMethod) missing.push('paymentMethod');
    if (totalPrice === undefined || totalPrice === null) missing.push('totalPrice');

    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
    }

    const newOrder = new Order({
      user_id: req.user.id || req.user.userId,
      departure_city_id: cleanId(departureCityId),
      destination_city_id: cleanId(destinationCityId),
      flight_id: cleanId(flightId),
      hotel_id: cleanId(hotelId),
      attractions: Array.isArray(attractions) ? attractions.map(cleanId).filter(Boolean) : [],
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

function toObjectId(id) {
  try {
    return new ObjectId(String(id));
  } catch (err) {
    console.warn('⚠️ Invalid ObjectId:', id);
    return null;
  }
}

function toObjectId(id) {
  try { return new ObjectId(String(id)); }
  catch { return null; }
}

export async function getUserOrders(req, res) {
  if (!req.user?.id && !req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const userId = req.user.id || req.user.userId;
    const db     = await connectDB();

    // 1) aggregation pipeline: match + four lookups + project
    const orders = await db.collection('orders').aggregate([
      { $match: { user_id: toObjectId(userId) } },

      // departure city
      {
        $lookup: {
          from:         'city',               // ← adjust if your collection is named 'cities'
          localField:   'departure_city_id',
          foreignField: '_id',
          as:           'departureCity'
        }
      },
      { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },

      // destination city
      {
        $lookup: {
          from:         'city',
          localField:   'destination_city_id',
          foreignField: '_id',
          as:           'destinationCity'
        }
      },
      { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },

      // flight
      {
        $lookup: {
          from:         'flights',            // ← adjust if yours is 'flight' or something else
          localField:   'flight_id',
          foreignField: '_id',
          as:           'flight'
        }
      },
      { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },

      // hotel
      {
        $lookup: {
          from:         'hotels',             // ← adjust if yours is 'hotel'
          localField:   'hotel_id',
          foreignField: '_id',
          as:           'hotel'
        }
      },
      { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },

      // finally, pick the fields you want to return
      {
        $project: {
          _id:                    1,
          user_id:                1,
          departure_city_id:      1,
          destination_city_id:    1,
          flight_id:              1,
          hotel_id:               1,
          attractions:            1,
          transportation:         1,
          payment_method:         1,
          total_price:            1,
          created_at:             1,

          // pull the name from the joined docs
          departure_city_name:    '$departureCity.city',
          destination_city_name:  '$destinationCity.city',

          // **make sure your flight docs really use `name`**  
          // if they use `flightNumber` or `title`, change this accordingly
          flight_name:            '$flight.name',  

          // same for hotels—often it's `name` or `hotelName`
          hotel_name:             '$hotel.name'
        }
      }
    ]).toArray();

    return res.status(200).json({ success: true, orders });

  } catch (err) {
    console.error('❌ Get orders error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}
const orders = await db.collection('orders').aggregate([
  { $match: { user_id: toObjectId(userId) } },
  {
    $lookup: {
      from:     'city',
      localField:  'departure_city_id',
      foreignField:'_id',
      as:       'departureCity'
    }
  },
  { $unwind: { path: '$departureCity', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'city',
      localField:  'destination_city_id',
      foreignField:'_id',
      as: 'destinationCity'
    }
  },
  { $unwind: { path: '$destinationCity', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'flights',
      localField:  'flight_id',
      foreignField:'_id',
      as:       'flight'
    }
  },
  { $unwind: { path: '$flight', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'hotels',
      localField:  'hotel_id',
      foreignField:'_id',
      as:       'hotel'
    }
  },
  { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },
  {
    $project: {
      // keep all original order fields…
      _id: 1, user_id:1, departure_city_id:1, destination_city_id:1,
      flight_id:1, hotel_id:1, attractions:1,
      transportation:1, payment_method:1, total_price:1, created_at:1,
      // …and add the names
      departure_city_name:   '$departureCity.city',
      destination_city_name: '$destinationCity.city',
      flight_name:           '$flight.name',
      hotel_name:            '$hotel.name'
    }
  }
]).toArray();

res.json({ success: true, orders });


