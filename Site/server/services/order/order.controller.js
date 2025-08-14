import Order, { isValidObjectId } from './order.model.js';
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";
import { ObjectId } from "mongodb";

// ===== Helper Functions =====
function looksLikeObjectId(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
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
function getFlightName(flight, index) {
  if (!flight) return "Flight not found";

  // Handle airlines array (your actual data structure)
  if (flight.airlines && Array.isArray(flight.airlines)) {
    const selectedFlight = flight.airlines[index];
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

// Helper to get hotel name safely
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
    console.error("❌ City lookup failed for ID:", cityId, error.message);
    return null;
  }
}

// Safe database operation wrapper
async function safeDbOperation(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    if (error.name === 'MongoNetworkError' || error.message.includes('SSL') || error.message.includes('TLS')) {
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

// POST /api/order - Create new order with city name resolution
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

    // Resolve city names for denormalization
    const [depCity, dstCity] = await Promise.all([
      safeDbOperation(() => findCityById(depClean), null),
      safeDbOperation(() => findCityById(dstClean), null)
    ]);

    // Create new order with denormalized city names
    const newOrder = new Order({
      user_id: String(req.user.id),
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: flightId,
      hotel_id: hotelId,
     attractions: cleanedAttractions,
       attraction_names: Array.isArray(attractionNames) ? attractionNames : [],
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
      // Store denormalized names
      flight_name: flightName || null,
      hotel_name: hotelName || null,
      attraction_names: Array.isArray(attractionNames) ? attractionNames : [],
      departure_city_name: depCity?.city || depCity?.name || null,
      destination_city_name: dstCity?.city || dstCity?.name || null
    });

    const savedOrder = await newOrder.save();
    const orderObject = savedOrder.toObject();

    return res.status(201).json({
      ...orderObject,
      _id: orderObject._id?.toString() || null,
      user_id: orderObject.user_id?.toString() || null,
      departure_city_id: orderObject.departure_city_id?.toString() || null,
      destination_city_id: orderObject.destination_city_id?.toString() || null,
      flight_id: orderObject.flight_id?.toString() || null,
      hotel_id: orderObject.hotel_id?.toString() || null,
      attractions: Array.isArray(orderObject.attractions)
        ? orderObject.attractions.map(id => id.toString())
        : []
    });

  } catch (err) {
    console.error("❌ Error creating order:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET /api/order - Get user orders with enriched data
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const userId = String(req.user.id);
    console.log("📦 Fetching orders for user:", userId);

    // Fetch orders with retry wrapper
    const rawOrders = await safeDbOperation(() => Order.findByUserId(userId), []);
    if (!rawOrders || rawOrders.length === 0) {
      console.log("📦 No orders found for user:", userId);
      return res.status(200).json({ success: true, orders: [] });
    }
    console.log("📦 Retrieved orders:", rawOrders.length);

    const enrichedOrders = await Promise.all(
      rawOrders.map(async (order) => {
        try {
          console.log("🔍 Processing order:", order._id);

          // Convert order to object if it's an instance
          const orderData = order.toObject ? order.toObject() : order;

          // Extract clean IDs and indexes
        const flightObjectId = cleanId(orderData.flight_id); // e.g., "6878c5126bcf8c4c6887f6ab"
const flightIndex = extractIndex(orderData.flight_id); // e.g., 0
const hotelObjectId = cleanId(orderData.hotel_id); // ← missing
          const hotelIndex = extractIndex(orderData.hotel_id);
          const depCityObjectId = cleanId(orderData.departure_city_id);
          const dstCityObjectId = cleanId(orderData.destination_city_id);

          // Check if we have stored names (preferred approach)
          const hasStoredDepartureCity = !!orderData.departure_city_name;
          const hasStoredDestinationCity = !!orderData.destination_city_name;
          const hasStoredFlightName = !!orderData.flight_name;
          const hasStoredHotelName = !!orderData.hotel_name;
          const storedAttractions = Array.isArray(orderData.attraction_names) ? orderData.attraction_names : [];

          // Only fetch from DB what we don't have stored
          const fetchPromises = [];
          
          // Departure city
          if (!hasStoredDepartureCity) {
            fetchPromises.push(safeDbOperation(() => findCityById(depCityObjectId), null));
          } else {
            fetchPromises.push(Promise.resolve(null));
          }
          
          // Destination city
          if (!hasStoredDestinationCity) {
            fetchPromises.push(safeDbOperation(() => findCityById(dstCityObjectId), null));
          } else {
            fetchPromises.push(Promise.resolve(null));
          }
          
          // Flight
          if (!hasStoredFlightName) {
            fetchPromises.push(safeDbOperation(() => Flight.findById(flightObjectId), null));
          } else {
            fetchPromises.push(Promise.resolve(null));
          }
          
          // Hotel
          if (!hasStoredHotelName) {
            fetchPromises.push(safeDbOperation(() => Hotel.findById(hotelObjectId), null));
          } else {
            fetchPromises.push(Promise.resolve(null));
          }

          const [departureCity, destinationCity, flight, hotelDoc] = await Promise.all(fetchPromises);

          // Resolve final names
          const departureCityName = hasStoredDepartureCity
            ? orderData.departure_city_name
            : (departureCity?.city || departureCity?.name || `Unknown Departure (${depCityObjectId})`);

          const destinationCityName = hasStoredDestinationCity
            ? orderData.destination_city_name
            : (destinationCity?.city || destinationCity?.name || `Unknown Destination (${dstCityObjectId})`);

          const flightName = hasStoredFlightName
            ? orderData.flight_name
            : getFlightName(flight, flightIndex);

          const hotelName = hasStoredHotelName
            ? orderData.hotel_name
            : getHotelName(hotelDoc, hotelIndex);

          // Handle attractions
         // Handle attractions
// Handle attractions: use stored names if available, otherwise fallback to order array
// Handle attractions
// Handle attractions
let attractionNames = [];

// If stored attraction names exist, use them
if (storedAttractions.length > 0) {
  attractionNames = storedAttractions;
} 
// Otherwise, fetch real attraction names from the database
else if (Array.isArray(orderData.attractions) && orderData.attractions.length > 0) {
  attractionNames = await getAttractionNames(orderData.attractions, orderData.destination_city_id);
}

// Fallback to empty array if nothing found
if (!Array.isArray(attractionNames)) attractionNames = [];




          console.log("✅ Resolved names:", {
            departure: departureCityName,
            destination: destinationCityName,
            flight: flightName,
            hotel: hotelName,
          });

        return {
  _id: orderData._id?.toString() || null,
  user_id: orderData.user_id?.toString() || null,
  departure_city_id: orderData.departure_city_id?.toString() || null,
  destination_city_id: orderData.destination_city_id?.toString() || null,
  flight_id: orderData.flight_id?.toString() || null,
  hotel_id: orderData.hotel_id?.toString() || null,
  attractions: attractionNames,
  transportation: orderData.transportation,
  payment_method: orderData.payment_method,
  total_price: orderData.total_price,
  created_at: orderData.created_at,
  createdAt: orderData.created_at, // Alias

  // Human-readable names
  departure_city_name: departureCityName,
  destination_city_name: destinationCityName,
  flight_name: flightName,
  hotel_name: hotelName,
  attraction_names: attractionNames, // ✅ Already stored names
};

        } catch (orderError) {
          console.error("❌ Error processing order:", orderError);
          // Return a safe fallback for this order
          const orderData = order.toObject ? order.toObject() : order;
          return {
            _id: orderData._id?.toString() || null,
            user_id: orderData.user_id?.toString() || null,
            departure_city_id: orderData.departure_city_id?.toString() || null,
            destination_city_id: orderData.destination_city_id?.toString() || null,
            flight_id: orderData.flight_id?.toString() || null,
            hotel_id: orderData.hotel_id?.toString() || null,
            attractions: [],
            transportation: orderData.transportation || null,
            payment_method: orderData.payment_method || "Unknown",
            total_price: orderData.total_price || 0,
            created_at: orderData.created_at || new Date(),
            createdAt: orderData.created_at || new Date(),
            departure_city_name: "Error loading city name",
            destination_city_name: "Error loading city name",
            flight_name: "Error loading flight name",
            hotel_name: "Error loading hotel name",
            attraction_names: [],
          };
        }
      })
    );

    console.log("✅ Enriched orders completed");
    return res.status(200).json(enrichedOrders); // Return array directly instead of wrapping in object

  } catch (err) {
    console.error("❌ Error fetching enriched orders:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
}
// async function getAttractionNames(attractionIds, destinationCityName) {
//   if (!attractionIds || attractionIds.length === 0) return [];

//   // If attraction IDs are already names, just return them
//   if (attractionIds.every(a => typeof a === "string")) return attractionIds;

//   // Otherwise, try to fetch from city document
//   const attractionDoc = await safeDbOperation(() =>
//     Attraction.findOne({ city: destinationCityName })
//   , null);

//   if (!attractionDoc || !Array.isArray(attractionDoc.attractions)) {
//     console.log("❌ No attractions array found in city document");
//     return attractionIds.map((_, i) => `Attraction ${i + 1}`);
//   }

//   return attractionIds.map((id, i) => {
//     const found = attractionDoc.attractions.find(a => a.name === id || a._id.toString() === id);
//     return found?.name || `Unknown Attraction ${i + 1}`;
//   });
// }



// Get attraction names helper
async function getAttractionNames(attractionIds, destinationCityId) {
  if (!Array.isArray(attractionIds) || attractionIds.length === 0) return [];

  try {
    const attractionDoc = await Attraction.findOne({ city_id: destinationCityId });
    if (!attractionDoc || !Array.isArray(attractionDoc.attractions)) return [];

    return attractionIds.map(id => {
      const found = attractionDoc.attractions.find(a => a._id.toString() === id || a.name === id);
      return found ? found.name : null;
    }).filter(Boolean);
  } catch (err) {
    console.error("❌ Error fetching attraction names:", err);
    return [];
  }
}

// Resolve order refs endpoint
export async function resolveOrderRefs(req, res) {
  try {
    // 0) Sanity: models present?
    if (!City || !Flight || !Hotel) {
      console.error("❌ Models not loaded:", { City: !!City, Flight: !!Flight, Hotel: !!Hotel });
      return res.status(500).json({ message: "Server models not initialized" });
    }

    // 1) Body + auth sanity
    if (!req.body) {
      console.error("❌ /resolve: req.body is undefined (missing express.json?)");
      return res.status(400).json({ message: "Missing JSON body" });
    }
    
    const { departure, destination, flight, hotel } = req.body;
    console.log("🔎 /resolve input:", { departure, destination, flight, hotel });
    
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const looksLikeOid = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

    // 2) Safe helpers (never throw)
    const findCity = async (val) => {
      try {
        if (!val) return null;
        // If it's a 24-hex string, try by id first
        if (looksLikeOid(val)) {
          const byId = await City.findById(val);
          if (byId) return byId;
        }
        // Fall back to your provided method (case-insensitive name match)
        const byName = await City.findByName(val);
        if (byName) return byName;
        // Optional: try a naive slug→name fallback (e.g., "new-york" → "New York")
        const maybeName = String(val).replace(/-/g, ' ');
        if (maybeName && maybeName !== val) {
          const byName2 = await City.findByName(maybeName);
          if (byName2) return byName2;
        }
        return null;
      } catch (e) {
        console.error("❌ City lookup failed:", e);
        return null;
      }
    };

    const findFlight = async (val, dstId) => {
      try {
        if (!val) return { doc: null, index: 0 };
        if (looksLikeOid(val)) return { doc: await Flight.findById(val), index: 0 };

        // Try many shapes (array subdocs OR root fields)
        const doc = await Flight.findOne({
          $or: [
            { destination_city_id: dstId },
            { "airlines.code": val }, { "airlines.name": val }, { "airlines.airline": val },
            { "flights.code": val },  { "flights.name": val },  { "flights.airline": val },
            { code: val }, { name: val }, { airline: val }
          ],
        });

        let index = 0;
        if (doc?.airlines?.length) {
          const i = doc.airlines.findIndex(a => a?.code === val || a?.name === val || a?.airline === val);
          if (i >= 0) index = i;
        } else if (doc?.flights?.length) {
          const i = doc.flights.findIndex(f => f?.code === val || f?.name === val || f?.airline === val);
          if (i >= 0) index = i;
        }
        return { doc, index };
      } catch (e) {
        console.error("❌ Flight lookup failed:", e);
        return { doc: null, index: 0 };
      }
    };

const findHotel = async (val, dstId) => {
  try {
    if (looksLikeOid(val)) return { doc: await Hotel.findById(val), index: 0 };

    const doc = await Hotel.findOne({
      $or: [
        { _id: dstId }, // ✅ Match by city _id since hotel doc has city info
        { "hotels.name": val },
        { city: dstCity.city || dstCity.name } // ✅ Match by city name
      ],
    });

        let index = 0;
        if (doc?.hotels?.length && val) {
          const i = doc.hotels.findIndex(h => h?.name === val);
          if (i >= 0) index = i;
        }
        return { doc, index };
      } catch (e) {
        console.error("❌ Hotel lookup failed:", e);
        return { doc: null, index: 0 };
      }
    };

    // 3) Resolve cities first
    const [depCity, dstCity] = await Promise.all([findCity(departure), findCity(destination)]);
    if (!depCity || !dstCity) {
      console.warn("⚠️ Could not resolve city ids", { depCity: !!depCity, dstCity: !!dstCity });
      return res.status(400).json({ message: "Could not resolve city ids" });
    }

    // 4) Flight and hotel, dependent on destination id
    const [{ doc: flightDoc, index: flightIndex = 0 }, { doc: hotelDoc, index: hotelIndex = 0 }] =
      await Promise.all([findFlight(flight, dstCity._id), findHotel(hotel, dstCity._id)]);

    if (!flightDoc) {
      console.warn("⚠️ Could not resolve flight", { flight, dest: dstCity._id?.toString() });
      return res.status(400).json({ message: "Could not resolve flight" });
    }
    if (!hotelDoc) {
      console.warn("⚠️ Could not resolve hotel", { hotel, dest: dstCity._id?.toString() });
      return res.status(400).json({ message: "Could not resolve hotel" });
    }

    // 5) Build compound ids
    const flightId = `${flightDoc._id.toString()}-${flightIndex}`;
    const hotelId  = `${hotelDoc._id.toString()}-${hotelIndex}`;

    console.log("✅ /resolve OK:", {
      departureCityId: depCity._id.toString(),
      destinationCityId: dstCity._id.toString(),
      flightId,
      hotelId,
    });

    return res.status(200).json({
      success: true,
      ids: {
        departureCityId: depCity._id.toString(),
        destinationCityId: dstCity._id.toString(),
        flightId,
        hotelId,
      },
    });
  } catch (err) {
    console.error("❌ resolveOrderRefs error:", err.stack || err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// 1) Resolve IDs
const resolveRes = await fetch("/api/order/resolve", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    departure: userResponses.departureCity,
    destination: userResponses.destinationCity,
    flight: userResponses.flight,
    hotel: userResponses.hotel,
  }),
});
const { ids } = await resolveRes.json();

// 2) Create order using resolved IDs
const orderRes = await fetch("/api/order", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    user_id: userId,
    departureCityId: ids.departureCityId,
    destinationCityId: ids.destinationCityId,
    flightId: ids.flightId,
    hotelId: ids.hotelId,
    attractions: userResponses.attractions,
    paymentMethod: userResponses.paymentMethod,
    totalPrice: calculateTotalPrice(userResponses),
  }),
});
