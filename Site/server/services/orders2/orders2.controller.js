// orders2.controller.js
import orders2DB from './orders2.db.js'; // ✅ ייבוא ה-instance המוכן
import { ObjectId } from 'mongodb';

class Orders2Controller {
  static async createOrder(req, res) {
    try {
      console.log('📝 Creating new order for user:', req.user?.id);
      console.log('📦 Order data received:', req.body);

// ── BEGIN PATCH ───────────────────────────────────────────────────────────────
const {
  departure_city_id, destination_city_id, flight_id, hotel_id,
  attractions, attractionNames,
  transportation, paymentMethod, totalPrice, tripDate, returnDate,
  // names coming from the client ↓
  departureCityName, destinationCityName, flightName, hotelName,
  // existing summary fields
  cityName, citySlug, flightNumber, departure, destination, summary, cityImage
} = req.body;

// tiny helpers
const is24 = (v) => typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
const toDateOrNull = (v) => v ? new Date(v) : null;

if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || !totalPrice) {
  return res.status(400).json({
    success: false,
    message: 'Missing required fields',
    required: ['cityName or departure_city_id', 'flightNumber or flight_id', 'tripDate', 'totalPrice'],
    received: Object.keys(req.body)
  });
}

if (!req.user?.id) {
  return res.status(401).json({ success: false, message: 'User authentication required' });
}

if (isNaN(totalPrice) || Number(totalPrice) <= 0) {
  return res.status(400).json({ success: false, message: 'Total price must be a positive number' });
}

const tripDateObj = new Date(tripDate);
if (isNaN(tripDateObj.getTime())) {
  return res.status(400).json({ success: false, message: 'Invalid trip date format' });
}

// Normalize attractions: keep ids in `attractions`, names in `attraction_names`
let attraction_ids = [];
let attraction_names = Array.isArray(attractionNames) ? attractionNames : [];
if (Array.isArray(attractions)) {
  for (const a of attractions) {
    if (is24(a)) attraction_ids.push(a);
    else if (typeof a === "string" && a.trim()) attraction_names.push(a.trim());
  }
}
const orderData = {
  // store user as ObjectId so queries using ObjectId match
  user_id: new ObjectId(req.user.id),

  // denormalized trip summary fields
  cityName: cityName?.trim() || null,
  citySlug: citySlug ? citySlug.trim() : (cityName ? cityName.toLowerCase().replace(/\s+/g, '-') : null),
  flightNumber: flightNumber?.trim() || null,
  departure: departure?.trim() || null,
  destination: destination?.trim() || null,
  tripDate: tripDateObj,
  returnDate: toDateOrNull(returnDate),
  total_price: Number(totalPrice),
  payment_method: paymentMethod || 'Credit Card',
  status: status || 'confirmed',
  booking_date: bookingDate ? toDateOrNull(bookingDate) : new Date(),
  summary: summary?.trim() || null,
  cityImage: cityImage?.trim() || null,

  // ids: only keep valid 24-hex; otherwise null
  departure_city_id: is24(departure_city_id) ? departure_city_id : null,
  destination_city_id: is24(destination_city_id) ? destination_city_id : null,
  flight_id: is24(flight_id) ? flight_id : null,

  // if UI mistakenly sends destination id as hotel_id, this will null it
  hotel_id: is24(hotel_id) ? hotel_id : null,

  transportation: transportation || null,

  // attractions normalized
  attractions: attraction_ids,      // ids only
  attraction_names,                 // names only

  // optional denormalized display names (helps UI even if lookups fail)
  flight_name: flightName || null,
  hotel_name: hotelName || null,
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

      res.json({ success: true, message: `Found ${result.totalOrders} orders`, data: result });
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
