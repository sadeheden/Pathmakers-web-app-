import orders2DB from './orders2.db.js'; // ✅ ייבוא ה-instance המוכן
import { ObjectId } from "mongodb";
const looksLikeId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const toOid = (v) => (looksLikeId(v) ? new ObjectId(v) : v ?? null);

class Orders2Controller {
  static async createOrder(req, res) {
    try {
      console.log('📝 Creating new order for user:', req.user?.id);
      console.log('📦 Order data received:', req.body);

     const {
       cityName, citySlug, flightNumber, departure, destination,
       tripDate, returnDate, totalPrice, paymentMethod, status,
       bookingDate, summary, cityImage, departure_city_id, destination_city_id,
       flight_id, hotel_id, attractions, transportation,
       // 👇 names coming from Main.jsx payload
       departureCityName, destinationCityName, flightName, hotelName,
       // allow both spellings for attractions names
       attraction_names, attractionNames
     } = req.body;

      if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || !totalPrice) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          required: ['cityName or departure_city_id', 'flightNumber or flight_id', 'tripDate', 'totalPrice'],
          received: Object.keys(req.body)
        });
      }

      if (!req.user?.id) return res.status(401).json({ success: false, message: 'User authentication required' });
      if (isNaN(totalPrice) || totalPrice <= 0) return res.status(400).json({ success: false, message: 'Total price must be a positive number' });

    const tripDateObj = new Date(tripDate);
 if (isNaN(tripDateObj.getTime())) {
   return res.status(400).json({ success: false, message: 'Invalid trip date format' });
 }
 // must be a future date (>= tomorrow)
 const today = new Date();
 today.setHours(0,0,0,0);
 const tomorrow = new Date(today);
 tomorrow.setDate(today.getDate() + 1);
 if (tripDateObj < tomorrow) {
   return res.status(400).json({ success: false, message: 'Trip date must be in the future (at least tomorrow)' });
 }
 let returnDateObj = req.body.returnDate ? new Date(req.body.returnDate) : null;
 if (!returnDateObj || isNaN(returnDateObj.getTime())) {
   // default to 7 days after tripDate
   returnDateObj = new Date(tripDateObj);
   returnDateObj.setDate(returnDateObj.getDate() + 7);
 }
 if (returnDateObj <= tripDateObj) {
   return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
 }
let finalAttractionNames =
  Array.isArray(attraction_names) ? attraction_names :
  Array.isArray(attractionNames) ? attractionNames : [];
finalAttractionNames = [...new Set(finalAttractionNames.map(String).filter(Boolean))];

let finalAttractionIds =
  Array.isArray(attractions) ? attractions.filter(looksLikeId).map((id) => new ObjectId(id)) : [];

const orderData = {
  user_id: new ObjectId(req.user.id),

  // legacy display fields you already had
  cityName: cityName?.trim() || null,
  citySlug: citySlug ? citySlug.trim() : cityName?.toLowerCase().replace(/\s+/g, '-') || null,
  flightNumber: flightNumber?.trim() || null,
  departure: departure?.trim() || null,
  destination: destination?.trim() || null,

  tripDate: new Date(tripDate),
  returnDate: returnDate ? new Date(returnDate) : null,
  tripDate: tripDateObj,
  returnDate: returnDateObj,

  // 👇 use camelCase so PersonalArea sees it
  bookingDate: bookingDate ? new Date(bookingDate) : new Date(),

  total_price: Number(totalPrice),
  payment_method: paymentMethod || "Credit Card",
  status: status || "confirmed",
  summary: summary?.trim() || null,
  cityImage: cityImage?.trim() || null,

  // IDs (normalize to ObjectId when possible)
  departure_city_id: toOid(departure_city_id),
  destination_city_id: toOid(destination_city_id),
  flight_id: flight_id ?? null,
  hotel_id: hotel_id ?? null,

  transportation: transportation || null,

  // ✅ denormalized names (both snake & camel for compatibility)
// ✅ names for display in PersonalArea
 departure_city_name:   departureCityName   || departure   || null,
 destination_city_name: destinationCityName || destination || null,

flight_name: flightName || flightNumber || null,
hotel_name: hotelName || null,

flightName: flightName || flightNumber || null,
hotelName: hotelName || null,

// ✅ attractions
 attractions: finalAttractionIds,
 attraction_names: finalAttractionNames,


// ✅ camelCase booking date (PersonalArea prefers this)
bookingDate: bookingDate ? new Date(bookingDate) : new Date(),

};



      if (orderData.returnDate && orderData.returnDate <= orderData.tripDate) {
        return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
      }

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
  static async checkConflict(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'User authentication required' });
      }

      const { destination, destination_city_id, tripDate, returnDate } = req.query;
      if (!tripDate) return res.status(400).json({ success: false, message: 'tripDate is required' });

      const tripDateObj = new Date(tripDate);
      if (isNaN(tripDateObj)) return res.status(400).json({ success: false, message: 'Invalid tripDate' });

      let returnDateObj = returnDate ? new Date(returnDate) : null;
      if (!returnDateObj || isNaN(returnDateObj)) {
        returnDateObj = new Date(tripDateObj);
        returnDateObj.setDate(returnDateObj.getDate() + 7); // default 7 days
      }

 const conflict = await orders2DB.findOverlappingOrder({
      userId: req.user.id,
      destinationName: destinationCityName || destination || cityName,
      destinationCityId: toOid(destination_city_id),
      tripDate: tripDateObj,
      returnDate: returnDateObj,
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: 'An overlapping order already exists for this destination and dates.',
        conflictOrderId: conflict._id,
        conflict,
      });
    }

    // ✅ now continue with order creation
    const newOrder = await orders2DB.createOrder(orderData);
    return res.status(201).json({ success: true, order: newOrder });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
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