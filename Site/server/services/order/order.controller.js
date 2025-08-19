import Order from './order.model.js';
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";
import { MongoClient, ObjectId } from "mongodb"; // you already import ObjectId; extend it

const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME || "travel";
let __client;

async function getDb() {
  if (!__client) {
    __client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await __client.connect();
  }
  return __client.db(dbName);
}

async function coll(name) {
  const db = await getDb();
  return db.collection(name);
}


/* =========================
   Helper Functions
   ========================= */

function looksLikeObjectId(v) {
  return typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);
}

// Use the official validator from mongodb driver
const isValidObjectId = (v) => typeof v === "string" && ObjectId.isValid(v);

// Safe wrapper for DB calls with fallback
async function safeDbOperation(fn, fallback = null) {
  try { return await fn(); }
  catch (err) {
    console.error("❌ DB op failed:", err?.message || err);
    return fallback;
  }
}

// Clean and extract the base ObjectId from a possibly compound ID (e.g., "abc123-2")
export function cleanId(id) {
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

// Find city by id (string/ObjectId) safely (used if you need it)
async function findCityById(cityId) {
  if (!cityId) return null;
  const idStr = typeof cityId === 'string' ? cityId : cityId?.toString?.();
  if (!idStr || !ObjectId.isValid(idStr)) return null;
  return City.findById(idStr);
}

/* =========================
   Flexible “find by any” helpers
   ========================= */


// Flight by id / airline code / name, scoped by destination id when possible
async function findFlightByAny(val, destinationId) {
  if (!val) return { doc: null, index: 0 };

  // Prefer Mongoose if available
  if (Flight && (typeof Flight.findOne === "function" || typeof Flight.findById === "function")) {
    if (/^[0-9a-fA-F]{24}$/.test(String(val))) {
      return { doc: await Flight.findById(val), index: 0 };
    }
    const doc = await Flight.findOne({
      $or: [
        { destination_city_id: destinationId },
        { "airlines.code": val },
        { "flights.code": val },
        { name: val },
        { airline: val },
      ],
    });
    // try to infer index from arrays if val was a code/name
    let index = 0;
    if (doc?.airlines?.length) {
      const i = doc.airlines.findIndex(a => a?.code === val || a?.name === val || a?.airline === val);
      if (i >= 0) index = i;
    } else if (doc?.flights?.length) {
      const i = doc.flights.findIndex(f => f?.code === val || f?.name === val || f?.airline === val);
      if (i >= 0) index = i;
    }
    return { doc, index };
  }

  // Native driver fallback
  const flightsCol = await coll("flights");

  if (/^[0-9a-fA-F]{24}$/.test(String(val))) {
    const doc = await flightsCol.findOne({ _id: new ObjectId(String(val)) });
    return { doc, index: 0 };
  }

  const doc = await flightsCol.findOne({
    $or: [
      { destination_city_id: destinationId },
      { "airlines.code": val },
      { "flights.code": val },
      { name: val },
      { airline: val },
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
}


// Hotel by id / name, scoped by destination id
async function findHotelByAny(val, destinationId) {
  // If no specific hotel selected, find any hotel for the destination
  if (!val) {
    const doc = await Hotel.findOne({ destination_city_id: destinationId });
    return { doc, index: 0 };
  }
  
  if (looksLikeObjectId(val)) return { doc: await Hotel.findById(val), index: 0 };

  const doc = await Hotel.findOne({
    $and: [
      { destination_city_id: destinationId },
      {
        $or: [
          { name: val },
          { 'hotels.name': val }
        ]
      }
    ]
  });

  let index = 0;
  if (doc?.hotels?.length) {
    const i = doc.hotels.findIndex(h => h?.name === val);
    if (i >= 0) index = i;
  }
  return { doc, index };
}

/* =========================
   Display name helpers
   ========================= */

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

  // Fallback flights array
  if (flight.flights && Array.isArray(flight.flights)) {
    const selectedFlight = flight.flights[index];
    if (selectedFlight) {
      return selectedFlight.name || selectedFlight.airline || `Flight ${index + 1}`;
    }
    return `Flight ${index + 1} (index out of range)`;
  }

  // Direct doc
  if (flight.name) return flight.name;
  if (flight.airline) return flight.airline;

  return "Unknown Flight";
}

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


/* =========================
   Controllers
   ========================= */

// POST /api/order/resolve
// POST /api/order/resolve — FORCE-UPSERT cities so this can never fail on city lookup
export async function resolveOrderRefs(req, res) {
  try {
    const is24 = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
    const pick = (v) => {
      if (!v) return "";
      if (typeof v === "string") return v.trim();
      return v.id || v._id || v.code || v.name || v.city || v.title || v.label || v.slug || "";
    };
    const parseCompound = (val) => {
      if (typeof val !== "string") return { base: String(val || ""), idx: 0, hadIdx: false };
      const [maybeId, maybeIdx] = val.split(/[-_]/);
      if (is24(maybeId)) {
        const n = parseInt(maybeIdx, 10);
        return { base: maybeId, idx: Number.isNaN(n) ? 0 : n, hadIdx: !Number.isNaN(n) };
      }
      return { base: val.trim(), idx: 0, hadIdx: false };
    };
    const sanitizeFreeText = (s) => {
      if (typeof s !== "string") return "";
      let t = s.trim();
      t = t.split(" - ")[0];
      t = t.replace(/\([^)]*\)/g, "");
      t = t.replace(/[$€₪£]\s*\d[\d.,]*/g, "");
      return t.trim().replace(/\s+/g, " ");
    };
    const slugify = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

    // ---- body ----
    const body = req.body || {};
    const departureRaw   = pick(body.departure)   || pick(body.departureCity)   || pick(body.departureCityId);
    const destinationRaw = pick(body.destination) || pick(body.destinationCity) || pick(body.destinationCityId);
    const flightRaw      = pick(body.flight);
    const hotelRaw       = pick(body.hotel);

    if (!departureRaw || !destinationRaw) {
      return res.status(400).json({ message: "Provide departure and destination." });
    }

    // ---- DB / collections ----
    const db = await getDb();
    const CitySing = db.collection("city");
    const CityPlural = db.collection("cities");
    const [singCount, plurCount] = await Promise.all([
      CitySing.countDocuments({}).catch(() => 0),
      CityPlural.countDocuments({}).catch(() => 0),
    ]);
    const Cities = plurCount > 0 ? CityPlural : CitySing;
    const Flights = db.collection("flights");
    const Hotels  = db.collection("hotels");

    console.log("[resolve] using collection:", Cities.collectionName,
      "| counts -> city:", singCount, "cities:", plurCount);
    console.log("[resolve] raw:", { departureRaw, destinationRaw, flightRaw, hotelRaw });

    // ---- FORCE UPSERT city helper ----
    async function ensureCity(val) {
      const trimmed = String(val || "").trim();
      if (!trimmed) return null;

      // if caller already sent an ObjectId string, try direct fetch
      if (is24(trimmed)) {
        const doc = await Cities.findOne({ _id: new ObjectId(trimmed) });
        if (doc) return doc;
      }

      const esc = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx  = new RegExp(`^${esc}$`, "i");
      const up = await Cities.findOneAndUpdate(
        { $or: [{ city: rx }, { name: rx }, { slug: rx }] },
        {
          $setOnInsert: {
            city: trimmed,
            name: trimmed,
            slug: slugify(trimmed),
            created_at: new Date(),
          },
          $set: {
            updated_at: new Date(),
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      console.log("[resolve] ensureCity", trimmed, "=>", up?.value?._id?.toString?.());
      return up?.value || null;
    }

    // ---- resolve cities (ALWAYS creates if missing) ----
    const depCity = await ensureCity(departureRaw);
    const dstCity = await ensureCity(destinationRaw);

    if (!depCity?._id) return res.status(400).json({ message: "Departure city not found." });
    if (!dstCity?._id) return res.status(400).json({ message: "Destination city not found." });

    // ---- resolve flight ----
    const parsedFlight = parseCompound(flightRaw);
    let flightDoc = null;
    let flightIndex = parsedFlight.idx;

    if (is24(parsedFlight.base)) {
      flightDoc = await Flights.findOne({ _id: new ObjectId(parsedFlight.base) });
      if (!parsedFlight.hadIdx) flightIndex = 0;
    } else if (parsedFlight.base) {
      const needle = sanitizeFreeText(parsedFlight.base);
      const doc = await Flights.findOne({
        $or: [
          { destination_city_id: String(dstCity._id) },
          { "airlines.code": needle },
          { "flights.code":  needle },
          { name:            needle },
          { airline:         needle },
        ],
      });
      flightDoc = doc;
      if (doc?.airlines?.length) {
        const i = doc.airlines.findIndex(a =>
          [a?.code, a?.name, a?.airline].some(x => typeof x === "string" && x.toLowerCase() === needle.toLowerCase())
        );
        if (i >= 0) flightIndex = i;
      } else if (doc?.flights?.length) {
        const i = doc.flights.findIndex(f =>
          [f?.code, f?.name, f?.airline].some(x => typeof x === "string" && x.toLowerCase() === needle.toLowerCase())
        );
        if (i >= 0) flightIndex = i;
      }
    }
    if (!flightDoc?._id) {
      return res.status(400).json({ message: "Could not resolve flight." });
    }

    // ---- resolve hotel ----
    const parsedHotel = parseCompound(hotelRaw);
    let hotelDoc = null;
    let hotelIndex = parsedHotel.idx;

    if (is24(parsedHotel.base)) {
      hotelDoc = await Hotels.findOne({ _id: new ObjectId(parsedHotel.base) });
      if (!parsedHotel.hadIdx) hotelIndex = 0;
    } else if (parsedHotel.base) {
      const needle = sanitizeFreeText(parsedHotel.base);
      const doc = await Hotels.findOne({
        $and: [
          { destination_city_id: String(dstCity._id) },
          { $or: [{ name: needle }, { "hotels.name": needle }] },
        ],
      });
      hotelDoc = doc;
      if (doc?.hotels?.length) {
        const i = doc.hotels.findIndex(h =>
          typeof h?.name === "string" && h.name.toLowerCase() === needle.toLowerCase()
        );
        if (i >= 0) hotelIndex = i;
      }
    }

    // ---- response ----
    const ids = {
      departureCityId: String(depCity._id),
      destinationCityId: String(dstCity._id),
      flightId: `${String(flightDoc._id)}-${flightIndex}`,
      hotelId: hotelDoc?._id ? `${String(hotelDoc._id)}-${hotelIndex}` : String(dstCity._id),
    };

    return res.status(200).json({ success: true, ids });
  } catch (err) {
    console.error("resolveOrderRefs error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}



// POST /api/order - Create new order - FIXED VERSION
export async function createOrder(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    console.log("🆕 Creating new order with body:", JSON.stringify(req.body, null, 2));

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
      console.log("❌ Missing required fields:", missing);
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Clean IDs (extract base ObjectId for cities; keep compound ids for flight/hotel)
    const depClean = cleanId(departureCityId);
    const dstClean = cleanId(destinationCityId);
    const fltClean = cleanId(flightId);
    const htlClean = cleanId(hotelId);

    console.log("🧹 Cleaned IDs:", { depClean, dstClean, fltClean, htlClean });

    if (!depClean || !dstClean || !fltClean || !htlClean) {
      console.log("❌ Invalid ID format after cleaning");
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Clean attraction IDs (if they're ObjectIds)
    const cleanedAttractions = Array.isArray(attractions)
      ? attractions
          .map(a => {
            // If it's already a valid ObjectId string, keep it
            if (typeof a === 'string' && isValidObjectId(a)) return a;
            // Try to clean it
            const cleaned = cleanId(a);
            return cleaned;
          })
          .filter(Boolean)
      : [];

    console.log("🎯 Cleaned attractions:", cleanedAttractions);

    // Ensure attractionNames is an array
    const cleanedAttractionNames = Array.isArray(attractionNames) 
      ? attractionNames.filter(name => name && typeof name === 'string')
      : [];

    console.log("🎯 Cleaned attraction names:", cleanedAttractionNames);

    // Create new order; store full compound IDs for flight/hotel (string with index)
    const newOrder = new Order({
      user_id: String(req.user.id),
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: flightId,  // Keep as compound string
      hotel_id: hotelId,    // Keep as compound string
      attractions: cleanedAttractions,
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
      // denormalized names if provided
      flight_name: flightName || null,
      hotel_name: hotelName || null,
      attraction_names: cleanedAttractionNames,
    });

    console.log("💾 Saving order...");
    const savedOrder = await newOrder.save();
    console.log("✅ Order saved with ID:", savedOrder._id);

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
    console.error("❌ Stack trace:", err.stack);
    return res.status(500).json({ 
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err.message : "Something went wrong"
    });
  }
}
// GET /api/order - Get user orders with enriched data
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  try {
    const userId = String(req.user.id);

    // Pull raw orders
    const rawOrders = await safeDbOperation(() => Order.findByUserId(userId), []);
    if (!rawOrders || rawOrders.length === 0) {
      console.log("📦 No orders found for user:", userId);
      return res.status(200).json({ success: true, orders: [] });
    }
    console.log("📦 Retrieved orders:", rawOrders.length);

    const enrichedOrders = await Promise.all(
      rawOrders.map(async (order) => {
        console.log("🔍 Processing order:", order._id?.toString?.() || order._id);

        // Extract clean IDs and indexes (support compound ids like "6807...-2")
        const depCityObjectId = cleanId(order.departure_city_id);
        const dstCityObjectId = cleanId(order.destination_city_id);

        const flightObjectId  = cleanId(order.flight_id);
        const flightIndex     = extractIndex(order.flight_id);

        const hotelObjectId   = cleanId(order.hotel_id);
        const hotelIndex      = extractIndex(order.hotel_id);

        // Stored names preferred (denormalized on save)
        const hasStoredDepartureCity   = !!order.departure_city_name;
        const hasStoredDestinationCity = !!order.destination_city_name;
        const hasStoredFlightName      = !!order.flight_name;
        const hasStoredHotelName       = !!order.hotel_name;

        const storedAttractions =
          Array.isArray(order.attraction_names) ? order.attraction_names : [];

        // Fetch only what’s missing
        const [departureCity, destinationCity, flightDoc, hotelDoc] = await Promise.all([
          hasStoredDepartureCity
            ? Promise.resolve(null)
            : safeDbOperation(() => City.findById(depCityObjectId), null),

          hasStoredDestinationCity
            ? Promise.resolve(null)
            : safeDbOperation(() => City.findById(dstCityObjectId), null),

          hasStoredFlightName
            ? Promise.resolve(null)
            : safeDbOperation(() => Flight.findById(flightObjectId), null),

          hasStoredHotelName
            ? Promise.resolve(null)
            : safeDbOperation(() => Hotel.findById(hotelObjectId), null),
        ]);

        // Resolve display names
        const departureCityName = hasStoredDepartureCity
          ? order.departure_city_name
          : (departureCity?.city || departureCity?.name || `Unknown (${depCityObjectId || "n/a"})`);

        const destinationCityName = hasStoredDestinationCity
          ? order.destination_city_name
          : (destinationCity?.city || destinationCity?.name || `Unknown (${dstCityObjectId || "n/a"})`);

        const flightName = hasStoredFlightName
          ? order.flight_name
          : getFlightName(flightDoc, flightIndex);

        const hotelName = hasStoredHotelName
          ? order.hotel_name
          : getHotelName(hotelDoc, hotelIndex);

        // Attractions: prefer stored names; else keep what's in `order.attractions`
        // Attractions: prefer stored names; else resolve IDs -> names from DB
let attractionNames = [];
if (storedAttractions.length > 0) {
  attractionNames = storedAttractions;
} else if (Array.isArray(order.attractions) && order.attractions.length > 0) {
  const ids = order.attractions
    .map(a => (typeof a === "string" ? a : a?.toString?.()))
    .filter(Boolean)
    .filter(isValidObjectId)
    .map(s => new ObjectId(s));

  if (ids.length) {
    const docs = await safeDbOperation(
      () => Attraction.find({ _id: { $in: ids } }),
      []
    );
    attractionNames = docs
      .map(d => d?.name || d?.title || d?.attractionName || d?.label)
      .filter(Boolean);
  }
}

        console.log("✅ Resolved names:", {
          departure: departureCityName,
          destination: destinationCityName,
          flight: flightName,
          hotel: hotelName,
        });

        // Normalize shape for the client
        const asObj = order.toObject?.() ?? order;
        return {
          ...asObj,
          _id: asObj._id?.toString?.() || asObj._id || null,
          user_id: asObj.user_id?.toString?.() || asObj.user_id || null,

          departure_city_id: asObj.departure_city_id?.toString?.() || asObj.departure_city_id || null,
          destination_city_id: asObj.destination_city_id?.toString?.() || asObj.destination_city_id || null,
          flight_id: asObj.flight_id?.toString?.() || asObj.flight_id || null,
          hotel_id: asObj.hotel_id?.toString?.() || asObj.hotel_id || null,

          total_price: asObj.total_price,
          created_at: asObj.created_at,
          payment_method: asObj.payment_method,
          transportation: asObj.transportation,

          // Human-readable
          departure_city_name: departureCityName,
          destination_city_name: destinationCityName,
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
