import orders2DB from './orders2.db.js';
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
      departureCityName, destinationCityName, flightName, hotelName,
      attraction_names, attractionNames
    } = req.body;

    // Validation
    if ((!cityName && !departure_city_id) || (!flightNumber && !flight_id) || !tripDate || !totalPrice) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['cityName or departure_city_id', 'FlightNumber or flight_id', 'tripDate', 'totalPrice'],
        received: Object.keys(req.body)
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'User authentication required' });
    }

 
  // 🔧 FIX: stricter totalPrice validation
if (!Number.isFinite(Number(totalPrice)) || Number(totalPrice) <= 0) {
  return res.status(400).json({ success: false, message: 'Total price must be a positive number' });
}

    // FIX: define userObjectId (prevents ReferenceError later)
    let userObjectId;
    try {
      userObjectId = new ObjectId(String(req.user.id));
    } catch {
      return res.status(400).json({ success: false, message: 'Bad user id format' });
    }

    // Parse and validate dates
 // --- Parse & normalize dates (avoid TDZ) ---
let tripDateObj;
let returnDateObj;

// tripDate: must be a valid date
tripDateObj = new Date(tripDate);
if (Number.isNaN(tripDateObj.getTime())) {
  return res.status(400).json({ success: false, message: 'Invalid trip date format' });
}

// returnDate: if missing/invalid, default to +7 days from tripDate
if (returnDate) {
  const tmp = new Date(returnDate);
  if (!Number.isNaN(tmp.getTime())) {
    returnDateObj = tmp;
  }
}
if (!returnDateObj) {
  returnDateObj = new Date(tripDateObj);
  returnDateObj.setDate(returnDateObj.getDate() + 7);
}

// chronological sanity
if (returnDateObj <= tripDateObj) {
  return res.status(400).json({ success: false, message: 'Return date must be after trip date' });
}

// must be at least tomorrow
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

if (tripDateObj < tomorrow) {
  return res.status(400).json({ success: false, message: 'Trip date must be in the future (at least tomorrow)' });
}

      // Check for overlapping orders BEFORE creating the order
      const preInsertConflict = await orders2DB.findOverlappingOrder({
        userId: req.user.id,
 destinationName: destinationCityName || destination || cityName, // string or undefined
  destinationCityId: toOid(destination_city_id) || undefined,    
        tripDate: tripDateObj,
        returnDate: returnDateObj,
      });

      if (preInsertConflict) {
        const dest =
          preInsertConflict.destination_city_name ||
          preInsertConflict.destination ||
          preInsertConflict.cityName ||
          "this destination";

        const tripStr = preInsertConflict.tripDate
          ? new Date(preInsertConflict.tripDate).toDateString()
          : "unknown";
        const returnStr = preInsertConflict.returnDate
          ? new Date(preInsertConflict.returnDate).toDateString()
          : "N/A";

        return res.status(409).json({
          success: false,
          conflict: true,
          message: `Can't create order — you already have a trip from ${tripStr} to ${returnStr} (${dest}).`,
          order: {
            id: preInsertConflict._id,
            orderNumber: preInsertConflict.orderNumber,
            destination: dest,
            tripDate: preInsertConflict.tripDate,
            returnDate: preInsertConflict.returnDate,
            status: preInsertConflict.status,
          },
        });
      }

      // Process attractions
      let finalAttractionNames = [];
      if (Array.isArray(attraction_names)) {
        finalAttractionNames = attraction_names;
      } else if (Array.isArray(attractionNames)) {
        finalAttractionNames = attractionNames;
      }
      finalAttractionNames = [...new Set(finalAttractionNames.map(String).filter(Boolean))];

      let finalAttractionIds = [];
      if (Array.isArray(attractions)) {
        finalAttractionIds = attractions.filter(looksLikeId).map((id) => new ObjectId(id));
      }

      // Create order data object
    // Create order data object (matches your target Mongo doc shape)
const orderData = {
  user_id: userObjectId,

  // legacy display fields
  cityName: cityName ? String(cityName) : null,
  citySlug: citySlug?.trim()
    ?? (cityName ? String(cityName).toLowerCase().replace(/\s+/g, "-") : null),
  flightNumber: flightNumber ? String(flightNumber) : null,
  departure: departure ? String(departure) : "Tel Aviv",
  destination: destination ? String(destination) : (cityName ? String(cityName) : null),

  // dates (Mongo Date objects)
  tripDate: tripDateObj,
  returnDate: returnDateObj,
  bookingDate: bookingDate ? new Date(bookingDate) : new Date(),

  // price & status
  total_price: Number(totalPrice),
  payment_method: paymentMethod ? String(paymentMethod) : "Credit Card",
  status: status ? String(status) : "confirmed",
  summary: summary ? String(summary) : null,
  cityImage: typeof cityImage === "string" ? cityImage : null,

  // canonical IDs (null or ObjectId)
  departure_city_id: toOid(departure_city_id),
  destination_city_id: toOid(destination_city_id),
  flight_id: toOid(flight_id),
  hotel_id: toOid(hotel_id),

  // misc
  transportation: transportation ? String(transportation) : null,

  // denormalized names (snake_case + camelCase)
  departure_city_name: departureCityName ? String(departureCityName) : (departure ? String(departure) : "Tel Aviv"),
  destination_city_name: destinationCityName ? String(destinationCityName) : (destination ? String(destination) : (cityName ? String(cityName) : null)),
  flight_name: flightName ? String(flightName) : (flightNumber ? String(flightNumber) : null),
  hotel_name: hotelName ? String(hotelName) : null,

  // camelCase duplicates for PersonalArea compatibility
  flightName: flightName ? String(flightName) : (flightNumber ? String(flightNumber) : null),
  hotelName: hotelName ? String(hotelName) : null,

  // attractions (ids & names)
  attractions: Array.isArray(attractions) ? attractions.filter(looksLikeId).map((id) => new ObjectId(id)) : [],
  attraction_names: Array.isArray(attraction_names)
    ? [...new Set(attraction_names.map((s) => String(s).trim()).filter(Boolean))]
    : Array.isArray(attractionNames)
      ? [...new Set(attractionNames.map((s) => String(s).trim()).filter(Boolean))]
      : [],
};

      // Create the order
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
        const dest =
          conflictingOrder.destination_city_name ||
          conflictingOrder.destination ||
          conflictingOrder.cityName ||
          destination ||
          "this destination";

        const tripStr = conflictingOrder.tripDate
          ? new Date(conflictingOrder.tripDate).toDateString()
          : "unknown";
        const returnStr = conflictingOrder.returnDate
          ? new Date(conflictingOrder.returnDate).toDateString()
          : "N/A";

        console.log("⚠️ Conflict found:", conflictingOrder._id);

        return res.status(200).json({
          success: true,
          conflict: true,
          message: `You already have a trip to ${dest} from ${tripStr} to ${returnStr}.`,
          order: {
            id: conflictingOrder._id,
            orderNumber: conflictingOrder.orderNumber,
            destination: dest,
            tripDate: conflictingOrder.tripDate,
            returnDate: conflictingOrder.returnDate,
            status: conflictingOrder.status,
          },
        });
      }

      // No conflict found
      return res.status(200).json({
        success: true,
        conflict: false,
        message: "No conflicts found",
      });

    } catch (error) {
      console.error('❌ Error in checkConflict controller:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check conflicts',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  static async getUserOrders(req, res) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ success: false, message: 'User authentication required' });
      }
let userObjectId;
try {
  userObjectId = new ObjectId(String(req.user.id));
} catch {
  return res.status(400).json({ success: false, message: 'Bad user id format' });
}
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        status: req.query.status || null,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder === 'asc' ? 1 : -1
      };

      const result = await orders2DB.getUserOrders(req.user.id, options);

      res.json({ 
        success: true, 
        message: `Found ${result.totalOrders} orders`, 
        data: result 
      });

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

// Additional standalone function for date conflict checking
const HEX24 = /^[0-9a-fA-F]{24}$/;
const asOid = (v) => (typeof v === "string" && HEX24.test(v)) ? new ObjectId(v) : null;

export async function hasDateConflict(req, res) {
  try {
    const userId = req.user?.id || req.user?._id || req.auth?.userId || req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: "UNAUTHENTICATED" });
    }

    // Validate user id format early (avoid DB throw)
    if (!HEX24.test(String(userId))) {
      return res.status(400).json({ success: false, error: "BAD_USER_ID" });
    }

    const destinationName = (req.query.destination || "").trim();
    const destinationCityId = asOid(req.query.destinationCityId || req.query.destination_city_id || "");

    // Dates: accept "YYYY-MM-DD" or ISO. Default returnDate = tripDate + 7
    const tripDateObj = new Date(req.query.tripDate);
    if (isNaN(tripDateObj.getTime())) {
      return res.status(400).json({ success: false, error: "BAD_TRIP_DATE" });
    }

    let returnDateObj = req.query.returnDate ? new Date(req.query.returnDate) : null;
    if (!returnDateObj || isNaN(returnDateObj.getTime())) {
      returnDateObj = new Date(tripDateObj);
      returnDateObj.setDate(returnDateObj.getDate() + 7);
    }

    if (returnDateObj <= tripDateObj) {
      return res.status(400).json({ success: false, error: "RANGE_ERROR" });
    }

    const conflict = await orders2DB.findOverlappingOrder({
      userId: String(userId),
      destinationName,
      destinationCityId: destinationCityId ? String(destinationCityId) : null,
      tripDate: tripDateObj,
      returnDate: returnDateObj,
    });

    if (conflict) {
      const dest =
        conflict.destination_city_name ||
        conflict.destination ||
        conflict.cityName;
      
      return res.status(200).json({
        success: true,
        conflict: true,
        order: {
          _id: conflict._id,
          orderNumber: conflict.orderNumber,
          destination: dest,
          tripDate: conflict.tripDate,
          returnDate: conflict.returnDate,
          status: conflict.status,
        },
      });
    }

    return res.status(200).json({ success: true, conflict: false });

  } catch (err) {
    console.error("❌ hasDateConflict error:", err);
    return res.status(500).json({ success: false, error: "SERVER_ERROR" });
  }
}

// Export static methods as named functions for router
export const createOrder = Orders2Controller.createOrder;
export const checkConflict = Orders2Controller.checkConflict;
export const getUserOrders = Orders2Controller.getUserOrders;

export default Orders2Controller;