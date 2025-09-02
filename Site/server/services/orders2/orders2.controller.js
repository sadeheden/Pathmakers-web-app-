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
// In your orders2.controller.js, replace the checkConflict method with this improved version:

static async checkConflict(req, res) {
  try {
    console.log('🔍 Checking for order conflicts:', req.query);
    
    if (!req.user?.id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized - Please log in' 
      });
    }

    const { destination, destination_city_id, tripDate, returnDate } = req.query;
    
    if (!destination && !destination_city_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'destination or destination_city_id is required' 
      });
    }
    
    if (!tripDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'tripDate is required' 
      });
    }

    // Parse and validate dates
    const tripDateObj = new Date(tripDate);
    if (isNaN(tripDateObj.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid tripDate format' 
      });
    }

    let returnDateObj = returnDate ? new Date(returnDate) : null;
    if (!returnDateObj || isNaN(returnDateObj.getTime())) {
      // Default to 7 days after trip date
      returnDateObj = new Date(tripDateObj);
      returnDateObj.setDate(returnDateObj.getDate() + 7);
    }

    if (returnDateObj <= tripDateObj) {
      return res.status(400).json({ 
        success: false, 
        message: 'Return date must be after trip date' 
      });
    }

    console.log('📅 Checking dates:', {
      destination,
      tripDate: tripDateObj.toISOString(),
      returnDate: returnDateObj.toISOString(),
      userId: req.user.id
    });

    // Check for overlapping orders
    const conflictingOrder = await orders2DB.findOverlappingOrder({
      userId: req.user.id,
      destinationName: destination,
      destinationCityId: destination_city_id,
      tripDate: tripDateObj,
      returnDate: returnDateObj,
    });

    if (conflictingOrder) {
      console.log('⚠️ Conflict found:', conflictingOrder._id);
      return res.json({ 
        success: true, 
        conflict: true, 
        message: `You already have a trip to ${destination} from ${conflictingOrder.tripDate.toDateString()} to ${conflictingOrder.returnDate?.toDateString() || 'N/A'}`,
        order: {
          id: conflictingOrder._id,
          orderNumber: conflictingOrder.orderNumber,
          destination: conflictingOrder.destination_city_name || conflictingOrder.destination,
          tripDate: conflictingOrder.tripDate,
          returnDate: conflictingOrder.returnDate,
          status: conflictingOrder.status
        }
      });
    }

    console.log('✅ No conflicts found');
    return res.json({ 
      success: true, 
      conflict: false, 
      message: 'No conflicts found'
    });

  } catch (error) {
    console.error('❌ Error in checkConflict:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error while checking conflicts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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


export async function hasDateConflict(req, res) {
  try {
    const db = req.app.locals.db;                 // ← set in server.js after connecting
    const orders = db.collection("orders2");

    const userIdStr = req.user?.id || req.user?._id || req.user?.userId;
    if (!userIdStr) return res.status(401).json({ success: false, error: "UNAUTHORIZED" });

    let userId;
    try {
      userId = new ObjectId(userIdStr);
    } catch {
      return res.status(400).json({ success: false, error: "BAD_USER_ID" });
    }

    const { tripDate, returnDate, destination } = req.query;
    if (!tripDate || !returnDate) {
      return res.status(400).json({ success: false, error: "MISSING_DATES" });
    }

    // Normalize to inclusive range (start of dep day .. end of ret day)
    const dep = new Date(tripDate);
    dep.setHours(0, 0, 0, 0);
    const ret = new Date(returnDate);
    ret.setHours(23, 59, 59, 999);

    if (isNaN(dep.getTime()) || isNaN(ret.getTime()) || ret <= dep) {
      return res.status(400).json({ success: false, error: "BAD_DATES" });
    }

    // Optional destination matching across your fields
    const dest = (destination || "").trim();
    const destFilter = dest
      ? { $or: [{ destination_city_name: dest }, { destination: dest }, { cityName: dest }] }
      : {};

    // Overlap condition: existing.tripDate <= newReturn AND existing.returnDate >= newStart
 // Replace the "query" + findOne with this variant if tripDate/returnDate are strings
const queryExpr = {
  $and: [
    { $expr: { $eq: ["$user_id", userId] } },
    // optional destination match as $or outside $expr:
    // apply destFilter outside as well, it still works together
    // Overlap using dateFromString
    {
      $expr: {
        $and: [
          {
            $lte: [
              { $dateFromString: { dateString: "$tripDate" } },
              ret,
            ],
          },
          {
            $gte: [
              { $dateFromString: { dateString: "$returnDate" } },
              dep,
            ],
          },
        ],
      },
    },
  ],
};

const finalQuery = dest ? { ...destFilter, ...queryExpr } : queryExpr;

const existing = await orders.findOne(finalQuery, {
  projection: { _id: 1, destination_city_name: 1, destination: 1, cityName: 1, tripDate: 1, returnDate: 1, status: 1 },
});


    return res.json({
      success: true,
      conflict: !!existing,
      order: existing
        ? {
            _id: existing._id,
            destination_city_name:
              existing.destination_city_name || existing.destination || existing.cityName,
            tripDate: existing.tripDate,
            returnDate: existing.returnDate,
            status: existing.status,
          }
        : null,
    });
  } catch (err) {
    console.error("hasDateConflict error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// re-export static methods as named functions so the router can import them
export const createOrder = Orders2Controller.createOrder;
export const getUserOrders = Orders2Controller.getUserOrders;

// If you don't have these implemented yet, either implement or temporarily comment-out
// their routes in the router to avoid undefined handlers.


export default Orders2Controller;