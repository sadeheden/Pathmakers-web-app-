import Order from './order.model.js';
import { ObjectId } from 'mongodb';

function cleanId(id) {
  try {
    return new ObjectId(id);
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
  if (!req.user?.id && !req.user?.userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const userId = req.user.id || req.user.userId;
    const orders = await Order.findByUserId(userId);
    res.status(200).json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
