import Order, { isValidObjectId } from './order.model.js';
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";
import { ObjectId } from "mongodb";

// ===== Helper Functions =====
// --- ADD NEAR THE TOP (helpers) ---
function looksLikeObjectId(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
}

// Flexible finders so you can pass slug/name/id
async function findCityByAny(val) {
  if (!val) return null;
  if (looksLikeObjectId(val)) return City.findById(val);
  // Try common fields (adjust to your schema)
  return (
    await City.findOne({ slug: val }) ||
    await City.findOne({ city: val }) ||
    await City.findOne({ name: val })
  );
}

async function findFlightByAny(val, destinationId) {
  if (!val) return null;
  if (looksLikeObjectId(val)) return { doc: await Flight.findById(val), index: 0 };

  // Try to match a code inside an airlines[] array (adjust to your schema)
  const doc = await Flight.findOne({
    $or: [
      { destination_city_id: destinationId },
      { 'airlines.code': val },
      { 'flights.code': val },
      { name: val }, { airline: val }
    ]
  });
  

  // Try to locate the index of that code inside arrays for compound id
  let index = 0;
  if (doc?.airlines?.length) {
    const i = doc.airlines.findIndex(a =>
      a?.code === val || a?.name === val || a?.airline === val
    );
    if (i >= 0) index = i;
  } else if (doc?.flights?.length) {
    const i = doc.flights.findIndex(f =>
      f?.code === val || f?.name === val || f?.airline === val
    );
    if (i >= 0) index = i;
  }
  return { doc, index };
}

async function findHotelByAny(val, destinationId) {
  if (!val) return { doc: await Hotel.findOne({ destination_city_id: destinationId }), index: 0 };
  if (looksLikeObjectId(val)) return { doc: await Hotel.findById(val), index: 0 };

  const doc = await Hotel.findOne({
    $or: [
      { destination_city_id: destinationId },
      { name: val },
      { 'hotels.name': val }
    ]
  });

  // pick index by name if present; else 0
  let index = 0;
  if (doc?.hotels?.length) {
    const i = doc.hotels.findIndex(h => h?.name === val);
    if (i >= 0) index = i;
  }
  return { doc, index };
}

// --- ADD THIS NEW CONTROLLER ---
export async function resolveOrderRefs(req, res) {
  try {
    if (!City || !Flight || !Hotel) {
      return res.status(500).json({ message: "Server models not initialized" });
    }

    if (!req.body) return res.status(400).json({ message: "Missing JSON body" });
    const { departure, destination, flight, hotel } = req.body;
    if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

    const looksLikeOid = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

const findCity = async (val) => {
  if (!val) return null;

  // אם זה ObjectId
  if (looksLikeObjectId(val)) {
    const byId = await City.findById(val);
    if (byId) return byId;
  }

  // חיפוש לפי שם העיר
  const byName = await City.findByName(val);
  return byName || null;
};



   const findFlight = async (flightId, dstCityId) => {
  try {
    if (!flightId) return { doc: null, index: 0 };

    // חפש את מסמך העיר לפי destination_city_id
    const cityFlights = await Flight.findById(dstCityId);
    if (!cityFlights?.airlines) return { doc: null, index: 0 };

    // מצא את האינדקס במערך airlines לפי ObjectId או שם
    const index = cityFlights.airlines.findIndex(a => a._id.toString() === flightId);
    if (index < 0) return { doc: null, index: 0 };

    return { doc: cityFlights, index };
  } catch (e) {
    console.error("❌ Flight lookup failed:", e);
    return { doc: null, index: 0 };
  }
};


    const findHotel = async (hotelName, dstCityId) => {
      if (!hotelName) return null;
      if (looksLikeOid(hotelName)) return await Hotel.findById(hotelName);

      const hotelsDoc = await Hotel.findByCity(dstCityId);
      if (!hotelsDoc?.hotels?.length) return null;

      const index = hotelsDoc.hotels.findIndex(h => h.name === hotelName);
      if (index < 0) return null;

      return { doc: hotelsDoc, index };
    };

    const [depCity, dstCity] = await Promise.all([findCity(departure), findCity(destination)]);
    if (!depCity || !dstCity) return res.status(400).json({ message: "Could not resolve city ids" });

    const flightResolved = await findFlight(flight, dstCity._id);
    if (!flightResolved) return res.status(400).json({ message: "Could not resolve flight" });

    const hotelResolved = await findHotel(hotel, dstCity._id);
    if (!hotelResolved) return res.status(400).json({ message: "Could not resolve hotel" });

    const flightId = `${flightResolved.doc._id}-${flightResolved.index}`;
    const hotelId = `${hotelResolved.doc._id}-${hotelResolved.index}`;

    return res.status(200).json({
      success: true,
      ids: {
        departureCityId: depCity._id,
        destinationCityId: dstCity._id,
        flightId,
        hotelId,
      },
    });

  } catch (err) {
    console.error("❌ resolveOrderRefs error:", err.stack || err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


// Clean and extract the base ObjectId from a possibly compound ID (e.g., "abc123-2")
function cleanId(id) {
  if (!id) return null;

  if (typeof id === 'object' && id.toString) {
    const idString = id.toString();
    if (isValidObjectId(idString)) return idString;
    return null;
  }

  if (typeof id === 'string') {
    const cleaned = id.split(/[-_]/)[0];
    if (isValidObjectId(cleaned)) return cleaned;
    if (isValidObjectId(id)) return id;
    return null;
  }

  return null;
}

// Extract index from compound ID (e.g., "flight_id-2" returns 2)
function extractIndex(compoundId) {
  if (typeof compoundId !== 'string') return 0;

  const parts = compoundId.split(/[-_]/);
  if (parts.length > 1) {
    const index = parseInt(parts[1], 10);
    return isNaN(index) ? 0 : index;
  }
  return 0;
}

// Helper to get flight name safely
// Updated helper functions for nested data structures
// Helper to get flight name safely - now handles airlines array correctly
async function findFlightByCityAndAirline(cityNameOrId, airlineName) {
  // קודם כל נמצא את העיר
  const cityDoc = await City.findByName(cityNameOrId) || await City.findById(cityNameOrId);
  if (!cityDoc) return null;

  // עכשיו נמצא את הטיסה בתוך מערך ה-airlines
  const flightIndex = cityDoc.airlines?.findIndex(
    (a) => a.name.toLowerCase() === airlineName.toLowerCase()
  );

  if (flightIndex === undefined || flightIndex === -1) return null;

  return { flightDoc: cityDoc, index: flightIndex };
}
function getFlightName(flight, index) {
  if (!flight) return "Flight not found";

  console.log("🔍 Flight document:", flight);
  console.log("🔍 Flight index:", index);

  // Handle airlines array (your actual data structure)
  if (flight.airlines && Array.isArray(flight.airlines)) {
    const selectedFlight = flight.airlines[index];
    console.log("🔍 Selected flight from airlines:", selectedFlight);
    
    if (selectedFlight) {
      return selectedFlight.name || selectedFlight.airline || `Flight ${index + 1}`;
    }
    return `Airline ${index + 1} (index out of range)`;
  }

  // Handle flights array (fallback)
  if (flight.flights && Array.isArray(flight.flights)) {
    const selectedFlight = flight.flights[index];
    if (selectedFlight) {
      return selectedFlight.name || selectedFlight.airline || `Flight ${index + 1}`;
    }
    return `Flight ${index + 1} (index out of range)`;
  }

  // Handle direct flight object
  if (flight.name) return flight.name;
  if (flight.airline) return flight.airline;

  return "Unknown Flight";
}


// Helper to get hotel name safely, considering hotel document has hotels array
function getHotelName(hotelDoc, index) {
  if (!hotelDoc) return "Hotel not found";

  if (hotelDoc.hotels && Array.isArray(hotelDoc.hotels)) {
    const selectedHotel = hotelDoc.hotels[index];
    if (selectedHotel) return selectedHotel.name || `Hotel ${index + 1}`;
    else return "Hotel index out of range";
  }

  if (hotelDoc.name) return hotelDoc.name;

  return "Hotel not found";
}

// POST /api/order - Create new order
export async function createOrder(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const {
      departureCityId,
      destinationCityId,
      flightId,
      hotelId,
      attractions,
      flightName,
      hotelName,
      transportation,
      attractionNames,
      paymentMethod,
      totalPrice
    } = req.body;

    // Validate required fields
    const missing = [];
    if (!departureCityId) missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!flightId) missing.push('flightId');
    if (!hotelId) missing.push('hotelId');
    if (!paymentMethod) missing.push('paymentMethod');
    if (totalPrice === undefined || totalPrice === null) missing.push('totalPrice');

    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Clean IDs (extract base ObjectId)
    const depClean = cleanId(departureCityId);
    const dstClean = cleanId(destinationCityId);
    const fltClean = cleanId(flightId);
    const htlClean = cleanId(hotelId);

    if (!depClean || !dstClean || !fltClean || !htlClean) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Clean attraction IDs
    const cleanedAttractions = Array.isArray(attractions)
      ? attractions.map(a => cleanId(a)).filter(Boolean)
      : [];

    // Create new order, store full compound IDs (with indexes if any)
    const newOrder = new Order({
    user_id: String(req.user.id),
    departure_city_id: depClean,
    destination_city_id: dstClean,
    flight_id: flightId,
    hotel_id: hotelId,
    attractions: cleanedAttractions,
    transportation,
    payment_method: paymentMethod,
    total_price: totalPrice,
    created_at: new Date(),
    // NEW: store denormalized names if provided
    flight_name: flightName || null,
    hotel_name: hotelName || null,
    attraction_names: Array.isArray(attractionNames) ? attractionNames : [],
  });

    const savedOrder = await newOrder.save();

    return res.status(201).json({
      _id: savedOrder._id.toString(),
      user_id: savedOrder.user_id?.toString() || null,
      departure_city_id: savedOrder.departure_city_id?.toString() || null,
      destination_city_id: savedOrder.destination_city_id?.toString() || null,
      flight_id: savedOrder.flight_id?.toString() || null,
      hotel_id: savedOrder.hotel_id?.toString() || null,
      attractions: Array.isArray(savedOrder.attractions)
        ? savedOrder.attractions.map(id => id.toString())
        : [],
      transportation: savedOrder.transportation,
      payment_method: savedOrder.payment_method,
      total_price: savedOrder.total_price,
      created_at: savedOrder.created_at,
            flight_name: savedOrder.flight_name ?? null,
      hotel_name: savedOrder.hotel_name ?? null,
      attraction_names: savedOrder.attraction_names ?? [],
    });

  } catch (err) {
    console.error("❌ Error creating order:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET /api/order - Get user orders with enriched data
// GET /api/order - Get user orders with enriched data
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const userId = String(req.user.id);

    // Fetch orders with retry wrapper
    const rawOrders = await safeDbOperation(() => Order.findByUserId(userId), []);
    if (!rawOrders || rawOrders.length === 0) {
      console.log("📦 No orders found for user:", userId);
      return res.status(200).json({ success: true, orders: [] });
    }
    console.log("📦 Retrieved orders:", rawOrders.length);

    const enrichedOrders = await Promise.all(
      rawOrders.map(async (order) => {
        console.log("🔍 Processing order:", order._id);

        // Extract clean IDs + indexes
        const flightObjectId   = cleanId(order.flight_id);
        const hotelObjectId    = cleanId(order.hotel_id);
        const flightIndex      = extractIndex(order.flight_id);
        const hotelIndex       = extractIndex(order.hotel_id);
        const depCityObjectId  = cleanId(order.departure_city_id);
        const dstCityObjectId  = cleanId(order.destination_city_id);

        // Prefer stored names — skip DB for those when present
        const hasStoredFlightName = !!order.flight_name;
        const hasStoredHotelName  = !!order.hotel_name;
        const storedAttractions   = Array.isArray(order.attraction_names) ? order.attraction_names : [];

        // Parallel fetches (conditionally skip flight/hotel lookups)
        const [departureCity, destinationCity, flight, hotelDoc] = await Promise.all([
          safeDbOperation(() => findCityById(depCityObjectId), null),
          safeDbOperation(() => findCityById(dstCityObjectId), null),
          hasStoredFlightName
            ? Promise.resolve(null)
            : safeDbOperation(() => Flight.findById(flightObjectId), null),
          hasStoredHotelName
            ? Promise.resolve(null)
            : safeDbOperation(() => Hotel.findById(hotelObjectId), null),
        ]);

        // Attractions: prefer stored names; else derive from city doc
        const attractionNames = storedAttractions.length
          ? storedAttractions
          : await safeDbOperation(() => getAttractionNames(order.attractions, dstCityObjectId), []);

        // Resolve names
        const flightName = hasStoredFlightName
          ? order.flight_name
          : getFlightName(flight, flightIndex);

        const hotelName = hasStoredHotelName
          ? order.hotel_name
          : getHotelName(hotelDoc, hotelIndex);

        console.log("✅ Resolved names:", {
          departure: departureCity?.city || "Unknown",
          destination: destinationCity?.city || "Unknown",
          flight: flightName,
          hotel: hotelName,
        });

        return {
          ...order.toObject?.(),
          _id: order._id?.toString?.() || null,
          user_id: order.user_id?.toString?.() || null,
          departure_city_id: order.departure_city_id?.toString?.() || null,
          destination_city_id: order.destination_city_id?.toString?.() || null,
          flight_id: order.flight_id?.toString?.() || null,
          hotel_id: order.hotel_id?.toString?.() || null,
          attractions: order.attractions?.map(a => a.toString?.()) || [],
          total_price: order.total_price,
          created_at: order.created_at,
          payment_method: order.payment_method,
          transportation: order.transportation,

          // Human-readable
          departure_city_name: departureCity?.city || departureCity?.name || `Unknown (${depCityObjectId})`,
          destination_city_name: destinationCity?.city || destinationCity?.name || `Unknown (${dstCityObjectId})`,
          flight_name: flightName,
          hotel_name: hotelName,
          attraction_names: attractionNames,
        };
      })
    );

    console.log("✅ Enriched orders completed");
    return res.status(200).json({ success: true, orders: enrichedOrders });
  } catch (err) {
    console.error("❌ Error fetching enriched orders:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}


async function getAttractionNames(attractionIds, destinationCityId) {
  if (!attractionIds || !Array.isArray(attractionIds) || attractionIds.length === 0) {
    return [];
  }

  try {
    const cityDoc = await safeDbOperation(
      () => City.findById(destinationCityId),
      null
    );

    if (!cityDoc || !cityDoc.attractions || !Array.isArray(cityDoc.attractions)) {
      console.log("❌ No attractions array found in city document");
      return attractionIds.map((_, index) => `Attraction ${index + 1}`);
    }

    console.log("🔍 City attractions:", cityDoc.attractions.length, "attractions found");

    const attractionNames = attractionIds.map((id, orderIndex) => {
      // If it's a number or string number, treat as index
      const index = parseInt(id);
      if (!isNaN(index) && index >= 0 && index < cityDoc.attractions.length) {
        return cityDoc.attractions[index].name || `Attraction ${index + 1}`;
      }
      
      // If it's a string, try to find by name
      if (typeof id === 'string') {
        const found = cityDoc.attractions.find(attr => attr.name === id);
        if (found) return found.name;
      }
      
      return `Unknown Attraction ${orderIndex + 1}`;
    });

    return attractionNames;
  } catch (error) {
    console.error("❌ Error fetching attraction names:", error);
    return attractionIds.map((_, index) => `Attraction ${index + 1}`);
  }
}


// Helper function to find city by ID with multiple approaches
async function findCityById(cityId) {
  if (!cityId) return null;
  
  try {
    // Try direct ObjectId lookup first
    if (isValidObjectId(cityId)) {
      const city = await City.findById(new ObjectId(cityId));
      if (city) return city;
    }
    
    // Try string lookup
    const cityByString = await City.findById(cityId);
    if (cityByString) return cityByString;
    
    return null;
  } catch (error) {
    console.error("❌ City lookup failed for ID:", cityId, error);
    return null;
  }
}
async function safeDbOperation(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    if (error.name === 'MongoNetworkError') {
      console.error("🔄 MongoDB connection issue, retrying...");
      // Wait a bit and try once more
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        return await operation();
      } catch (retryError) {
        console.error("❌ Retry failed:", retryError.message);
        return fallback;
      }
    }
    console.error("❌ Database operation failed:", error.message);
    return fallback;
  }
}
