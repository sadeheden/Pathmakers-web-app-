import Order from './order.model.js';
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";

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
        console.error("❌ City lookup failed:", e);        return null;
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
            { destination_city_id: dstId },
            { "hotels.name": val },
            { name: val }
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

  if (flight.airlines && Array.isArray(flight.airlines)) {
    const selectedFlight = flight.airlines[index];
    return selectedFlight?.name || selectedFlight?.airline || `Flight ${index + 1}`;
  }

  if (flight.flights && Array.isArray(flight.flights)) {
    const selectedFlight = flight.flights[index];
    return selectedFlight?.name || selectedFlight?.airline || `Flight ${index + 1}`;
  }

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
      transportation,
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
    const rawOrders = await Order.findByUserId(userId);
    console.log("📦 Retrieved orders:", rawOrders.length);

    const enrichedOrders = await Promise.all(
      rawOrders.map(async (order) => {
        console.log("🔍 Processing order:", order._id);
        console.log("🔍 Original flight_id:", order.flight_id);
        console.log("🔍 Original hotel_id:", order.hotel_id);

        // Extract clean IDs and indexes
        const flightObjectId = cleanId(order.flight_id);
        const hotelObjectId = cleanId(order.hotel_id);
        const flightIndex = extractIndex(order.flight_id);
        const hotelIndex = extractIndex(order.hotel_id);

        console.log("🔍 Flight ObjectId:", flightObjectId, "Index:", flightIndex);
        console.log("🔍 Hotel ObjectId:", hotelObjectId, "Index:", hotelIndex);

        // Fetch related documents in parallel
        const [
          departureCity,
          destinationCity,
          flight,
          hotelDoc,
          attractions
        ] = await Promise.all([
          City.findById(order.departure_city_id).catch(err => {
            console.error("❌ Error fetching departure city:", err);
            return null;
          }),
          City.findById(order.destination_city_id).catch(err => {
            console.error("❌ Error fetching destination city:", err);
            return null;
          }),
          Flight.findById(flightObjectId).catch(err => {
            console.error("❌ Error fetching flight:", err);
            return null;
          }),
          Hotel.findById(hotelObjectId).catch(err => {
            console.error("❌ Error fetching hotel:", err);
            return null;
          }),
          order.attractions?.length
            ? Promise.all(order.attractions.map(id => Attraction.findById(id).catch(() => null)))
            : []
        ]);

        // Resolve names safely
        const flightName = getFlightName(flight, flightIndex);
        const hotelName = getHotelName(hotelDoc, hotelIndex);

        console.log("✅ Flight name resolved:", flightName);
        console.log("✅ Hotel name resolved:", hotelName);

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

          // Human-readable names
          departure_city_name: departureCity?.city || "Unknown City",
          destination_city_name: destinationCity?.city || "Unknown City",
          flight_name: flightName,
          hotel_name: hotelName,
          attraction_names: attractions
            ? attractions.filter(Boolean).map(a => a.name || "Unknown Attraction")
            : [],
        };
      })
    );

    console.log("✅ Enriched orders completed");
    return res.status(200).json({ success: true, orders: enrichedOrders });

  } catch (err) {
    console.error("❌ Error fetching enriched orders:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
