import Order from './order.model.js';
import { ObjectId } from 'mongodb';

// פונקציה שמוודאת שה-ID תקין ומחזירה ObjectId או null אם לא תקין
function cleanId(id) {
  try {
    return new ObjectId(id);
  } catch (error) {
    console.warn(`Invalid ID passed to cleanId: ${id}`);
    return null;
  }
}

// יצירת הזמנה חדשה
export async function createOrder(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const {
      departureCityId,
      destinationCityId,
      flightId,
      hotelId,
      attractions,
      transportation,
      paymentMethod,
      totalPrice
    } = req.body;

    const missing = [];
    if (!departureCityId)   missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!flightId)          missing.push('flightId');
    if (!hotelId)           missing.push('hotelId');
    if (!paymentMethod)     missing.push('paymentMethod');
    if (totalPrice === undefined || totalPrice === null) missing.push('totalPrice');

    if (missing.length) {
      return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
    }

    const newOrder = new Order({
      user_id: req.user.id,
      departure_city_id: cleanId(departureCityId),
      destination_city_id: cleanId(destinationCityId),
      flight_id: cleanId(flightId),
      hotel_id: cleanId(hotelId),
      attractions: Array.isArray(attractions)
        ? attractions.map(cleanId).filter(Boolean)
        : [],
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date()
    });

    const saved = await newOrder.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

// שליפת כל ההזמנות למשתמש מחובר
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const orders = await Order.findByUserId(req.user.id);
    res.status(200).json(orders);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
