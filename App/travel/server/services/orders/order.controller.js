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

export async function getUserOrders(req, res) {
  if (!req.user?.id && !req.user?.userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
  const userId = req.user?.id;
    const db = await connectDB();

   const orders = await db.collection('orders')
  .find({ user_id: new ObjectId(String(userId)) }) // ✅ fix here
  .toArray();


    const cityCol = db.collection('city');
    const flightCol = db.collection('flights');
    const hotelCol = db.collection('hotels');

    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const departureCity = await cityCol.findOne({ _id: order.departure_city_id });
        const destinationCity = await cityCol.findOne({ _id: order.destination_city_id });
        const flight = await flightCol.findOne({ _id: order.flight_id });
        const hotel = await hotelCol.findOne({ _id: order.hotel_id });

        return {
          ...order,
          departure_city_name: departureCity?.name || 'Unknown',
          destination_city_name: destinationCity?.name || 'Unknown',
          flight_name: flight?.name || 'Unknown',
          hotel_name: hotel?.name || 'Unknown',
        };
      })
    );

    res.status(200).json({ success: true, orders: populatedOrders });

  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
