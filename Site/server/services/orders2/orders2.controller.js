// orders2.controller.js
import orders2DB from './orders2.db.js'; // ✅ ייבוא ה-instance המוכן
import { ObjectId } from 'mongodb';
import Attraction from '../attraction/att.model.js';

class Orders2Controller {
  static async createOrder(req, res) {
    try {
      console.log('📝 Creating new order for user:', req.user?.id);
      console.log('📦 Order data received:', req.body);

// ── BEGIN PATCH ───────────────────────────────────────────────────────────────
// ── BEGIN PATCH ───────────────────────────────────────────────────────────────
const {
  // canonical ids
  departure_city_id, destination_city_id, flight_id, hotel_id,
  attractions, attractionNames,

  // misc
  transportation, paymentMethod, totalPrice, tripDate, returnDate,

  // denormalized display names (optional)
  departureCityName, destinationCityName, flightName, hotelName,

  // legacy summary fields your UI already shows
  cityName, citySlug, flightNumber, departure, destination, summary, cityImage,

  // ✅ optional status/bookingDate coming from client
  status: bodyStatus,
  bookingDate: bodyBookingDate
} = req.body;

// tiny helpers
const is24 = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
const toDateOrNull = (v) => (v ? new Date(v) : null);

// required bits
if (!req.user?.id) {
  return res.status(401).json({ success: false, message: 'User authentication required' });
}
if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || totalPrice == null) {
  return res.status(400).json({
    success: false,
    message: 'Missing required fields',
    required: ['cityName or departure_city_id', 'flightNumber or flight_id', 'tripDate', 'totalPrice'],
    received: Object.keys(req.body)
  });
}
if (isNaN(totalPrice) || Number(totalPrice) <= 0) {
  return res.status(400).json({ success: false, message: 'Total price must be a positive number' });
}
const tripDateObj = new Date(tripDate);
if (isNaN(tripDateObj.getTime())) {
  return res.status(400).json({ success: false, message: 'Invalid trip date format' });
}

// normalize attractions -> ids + names
let attraction_ids = [];
let attraction_names = Array.isArray(attractionNames) ? attractionNames : [];
if (Array.isArray(attractions)) {
  for (const a of attractions) {
    if (is24(a)) attraction_ids.push(a);
    else if (typeof a === 'string' && a.trim()) attraction_names.push(a.trim());
  }
}

const orderData = {
  // store user as ObjectId so queries using ObjectId match
  user_id: new ObjectId(req.user.id),

  // denormalized trip summary
  cityName: cityName?.trim() || null,
  citySlug: citySlug ? citySlug.trim()
          : (cityName ? cityName.toLowerCase().replace(/\s+/g, '-') : null),
  flightNumber: flightNumber?.trim() || null,
  departure: departure?.trim() || null,
  destination: destination?.trim() || null,

  tripDate: tripDateObj,
  returnDate: toDateOrNull(returnDate),

  total_price: Number(totalPrice),
  payment_method: paymentMethod || 'Credit Card',

  // ✅ FIX: use provided values with safe defaults; camelCase for model
  status: bodyStatus || 'confirmed',
  bookingDate: bodyBookingDate ? new Date(bodyBookingDate) : new Date(),

  summary: summary?.trim() || null,
  cityImage: cityImage?.trim() || null,

  // ids: only keep valid 24-hex; otherwise null
  departure_city_id: is24(departure_city_id) ? departure_city_id : null,
  destination_city_id: is24(destination_city_id) ? destination_city_id : null,
  flight_id: is24(flight_id) ? flight_id : null,
  hotel_id: is24(hotel_id) ? hotel_id : null,

  transportation: transportation || null,

  // attractions normalized
  attractions: attraction_ids,
  attraction_names,

  // optional denormalized display names (nice for UI)
  flight_name: flightName || null,
  hotel_name: hotelName || null,

  // (optional) these names you send aren’t used by DB logic, but keeping them is harmless:
  departureCityName: departureCityName || null,
  destinationCityName: destinationCityName || null
};

// sanity: returnDate must be after tripDate
if (orderData.returnDate && orderData.returnDate <= orderData.tripDate) {
  return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
}

// ── END PATCH ─────────────────────────────────────────────────────────────────

      // ✅ שימוש ב-instance המיובא
      const savedOrder = await orders2DB.createOrder(orderData);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: savedOrder,
        orderId: savedOrder._id,
        orderNumber: savedOrder.orderNumber || null
      });

    } catch (error) {
      console.error('❌ Error in createOrder controller:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create order',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

static async getUserOrders(req, res) {
  try {
    if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication required' });

    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      status: req.query.status || null,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
    };

    const result = await orders2DB.getUserOrders(req.user.id, options);

    // ✅ Enrich attraction names if missing
    const orders = await Promise.all(result.orders.map(async (o) => {
      if (Array.isArray(o.attraction_names) && o.attraction_names.length) return o;

      const ids = (Array.isArray(o.attractions) ? o.attractions : [])
        .map(x => (typeof x === 'string' ? x : x?.toString?.()))
        .filter(s => /^[0-9a-fA-F]{24}$/.test(s))
        .map(s => new ObjectId(s));

      if (!ids.length) return o;

      const docs = await Attraction.find({ _id: { $in: ids } });
      const names = docs
        .map(d => d?.name || d?.title || d?.attractionName || d?.label)
        .filter(Boolean);

      return { ...o, attraction_names: names };
    }));

    res.json({ success: true, message: `Found ${result.totalOrders} orders`, data: { ...result, orders } });
  } catch (error) {
    console.error('❌ Error in getUserOrders controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

}

export default Orders2Controller;
