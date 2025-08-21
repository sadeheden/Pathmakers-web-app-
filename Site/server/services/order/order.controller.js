import Order from './order.model.js';
import path from "path";
import { getAttractionsByIds,getAllAttractionNamesForCity  } from "../attraction/att.db.js"; // ← adjust path if needed
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
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
// POST /api/order/resolve - FIXED VERSION with better debugging and error handling
// POST /api/order/resolve - FIXED VERSION with better debugging and error handling
export async function resolveOrderRefs(req, res) {
  try {
    const is24 = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);
    const pick = (v) => {
      if (!v) return "";
      if (typeof v === "string") return v.trim();
      return (v._id || v.id || v.code || v.name || v.city || v.title || v.label || v.slug || "");
    };
    const escapeRx = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const slugify = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const body = req.body || {};
    const departureRaw = pick(body.departure) || pick(body.departureCity) || pick(body.departureCityId);
    const destinationRaw = pick(body.destination) || pick(body.destinationCity) || pick(body.destinationCityId);
    const flightRaw = pick(body.flight);
    const hotelRaw = pick(body.hotel);

    if (!departureRaw || !destinationRaw) {
      return res.status(400).json({ message: "Provide departure and destination.", received: { departureRaw, destinationRaw } });
    }

    const db = await getDb();
    const CitySing = db.collection("city");
    const CityPlural = db.collection("cities");
    const [singCount, plurCount] = await Promise.all([
      CitySing.countDocuments().catch(() => 0),
      CityPlural.countDocuments().catch(() => 0),
    ]);
    const Cities = plurCount > 0 ? CityPlural : CitySing;
    const Flights = db.collection("flights");
    const Hotels = db.collection("hotels");

    async function ensureCity(val, cityType) {
      const trimmed = String(val || "").trim();
      if (!trimmed) return null;

      // fast path by _id
      if (is24(trimmed)) {
        try {
          const byId = await Cities.findOne({ _id: new ObjectId(trimmed) });
          if (byId) return byId;
        } catch {}
      }

      const slug = slugify(trimmed);
      const filter = {
        $or: [
          { city: { $regex: new RegExp(`^${escapeRx(trimmed)}$`, "i") } },
          { name: { $regex: new RegExp(`^${escapeRx(trimmed)}$`, "i") } },
          { slug },
        ],
      };
      const update = {
        $setOnInsert: { city: trimmed, name: trimmed, slug, created_at: new Date() },
        $set: { updated_at: new Date() },
      };
      const opts = { upsert: true, returnDocument: "after" };

      let doc = null;
      try {
        const resu = await Cities.findOneAndUpdate(filter, update, opts);
        doc = resu?.value || null;
        if (!doc) {
          // fallback – create manually אם upsert נכשל
          const insertRes = await Cities.insertOne({ city: trimmed, name: trimmed, slug, created_at: new Date() });
          doc = await Cities.findOne({ _id: insertRes.insertedId });
        }
        return doc;
      } catch (e) {
        return null;
      }
    }

    const depCity = await ensureCity(departureRaw, "departure city");
    const dstCity = await ensureCity(destinationRaw, "destination city");

    if (!depCity?._id) return res.status(400).json({ message: "Departure city not found.", input: departureRaw });
    if (!dstCity?._id) return res.status(400).json({ message: "Destination city not found.", input: destinationRaw });

    // --- Flight ---
    const parseCompound = (val) => {
      if (typeof val !== "string") return { base: String(val || ""), idx: 0, hadIdx: false };
      const m = val.match(/^([0-9a-fA-F]{24})[_-](\d+)$/);
      if (m) return { base: m[1], idx: parseInt(m[2], 10) || 0, hadIdx: true };
      return { base: val.trim(), idx: 0, hadIdx: false };
    };
    const airlineFromLabel = (s) => typeof s === "string" ? s.split(" - ")[0].replace(/\([^)]*\)/g, "").trim() : "";
    const parsePrice = (s) => { const m = typeof s === "string" ? s.match(/[$€₪£]\s*([\d.,]+)/) : null; return m ? Number(m[1].replace(/,/g, "")) : null; };

    const parsedFlight = parseCompound(flightRaw);
    let flightDoc = null;
    let flightIndex = parsedFlight.idx;

    if (/^[0-9a-fA-F]{24}$/.test(parsedFlight.base)) {
      flightDoc = await Flights.findOne({ _id: new ObjectId(parsedFlight.base) });
      if (!parsedFlight.hadIdx) flightIndex = 0;
    } else {
      const dstCityName = String(dstCity.city || dstCity.name).trim();
      const airlineName = airlineFromLabel(parsedFlight.base);
      const priceVal = parsePrice(flightRaw);
      flightDoc = await Flights.findOne({ city: { $regex: new RegExp(`^${escapeRx(dstCityName)}$`, "i") } });
      if (flightDoc?.airlines?.length) {
        let idx = flightDoc.airlines.findIndex(a => new RegExp(`^${escapeRx(airlineName)}$`, "i").test(a?.name || ""));
        if (idx < 0) idx = flightDoc.airlines.findIndex(a => new RegExp(escapeRx(airlineName), "i").test(a?.name || ""));
        if (idx < 0 && priceVal != null) idx = flightDoc.airlines.findIndex(a => Number(a?.price) === priceVal);
        flightIndex = idx >= 0 ? idx : 0;
      }
    }
    if (!flightDoc) { flightDoc = await Flights.findOne({}); flightIndex = 0; }
    const flightCompoundId = flightDoc ? `${String(flightDoc._id)}_${flightIndex}` : `${new ObjectId()}_0`; // fallback dummy

    // --- Hotel ---
    const parsedHotel = parseCompound(hotelRaw);
    let hotelDoc = null;
    let hotelIndex = parsedHotel.idx;
    if (is24(parsedHotel.base)) hotelDoc = await Hotels.findOne({ _id: new ObjectId(parsedHotel.base) });
    else if (parsedHotel.base) {
      const needle = parsedHotel.base.replace(/\([^)]*\)/g, "").split(" - ")[0].trim();
      hotelDoc = await Hotels.findOne({ $and: [{ destination_city_id: String(dstCity._id) }, { $or: [{ name: needle }, { "hotels.name": needle }] }] });
    }
    if (!hotelDoc) hotelDoc = await Hotels.findOne({ destination_city_id: String(dstCity._id) });
    if (!hotelDoc) {
      // fallback – אם אין מלון בכלל, צור dummy עם city id
      hotelDoc = { _id: dstCity._id };
      hotelIndex = 0;
    }

    const ids = {
      departureCityId: String(depCity._id),
      destinationCityId: String(dstCity._id),
      flightId: flightCompoundId,
      hotelId: `${String(hotelDoc._id)}-${hotelIndex}`, // תמיד קיים
    };

    return res.status(200).json({ success: true, ids });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error", error: process.env.NODE_ENV === "development" ? err.message : undefined });
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
      attractions,        // array of attraction IDs (optional)
      flightName,
      hotelName,
      transportation,
      attractionNames,    // array of strings (optional)
      paymentMethod,
      totalPrice,

      // NEW flags from chat:
      selectAllCityAttractions,      // boolean → auto-include ALL city attractions
      destinationCityName            // optional helpful fallback (string)
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
            if (typeof a === 'string' && ObjectId.isValid(a)) return a; // already valid string ObjectId
            const cleaned = cleanId(a); // handles possible "id-index" strings
            return cleaned;
          })
          .filter(Boolean)
      : [];

    console.log("🎯 Cleaned attractions:", cleanedAttractions);

    // Ensure attractionNames is an array of strings (if provided)
    const cleanedAttractionNames = Array.isArray(attractionNames)
      ? attractionNames.filter(name => name && typeof name === 'string')
      : [];

    console.log("🎯 Cleaned attraction names (from body):", cleanedAttractionNames);

    // Decide finalAttractionNames (priority):
    // 1) If client sent names → use them.
    // 2) Else if selectAllCityAttractions → pull ALL names for destination city.
    // 3) Else if attraction IDs exist → resolve IDs → names.
    let finalAttractionNames = cleanedAttractionNames;

    if (!finalAttractionNames.length && selectAllCityAttractions) {
      const namesFromCity = await safeDbOperation(
        () => getAllAttractionNamesForCity({
          cityId: dstClean,
          cityName: destinationCityName || null
        }),
        []
      );
      if (namesFromCity.length) {
        finalAttractionNames = namesFromCity;
        console.log(`🧳 Filled ${namesFromCity.length} attraction names from city`);
      }
    }

    if (!finalAttractionNames.length && cleanedAttractions.length) {
      const docs = await safeDbOperation(
        () => getAttractionsByIds(cleanedAttractions),
        []
      );
      finalAttractionNames = (docs || [])
        .map(d => d?.name || d?.title || d?.label)
        .filter(Boolean);
      console.log(`🔗 Resolved ${finalAttractionNames.length} attraction names from IDs`);
    }

    // Create new order; store full compound IDs for flight/hotel (string with index)
    const userId = ObjectId.isValid(req.user.id) ? new ObjectId(req.user.id) : String(req.user.id);
    const newOrder = new Order({
      // choose ObjectId when possible so reads match queries
      user_id: userId,
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: flightId,    // Keep as compound string (e.g., "<docId>_<idx>")
      hotel_id: hotelId,      // Keep as compound string (e.g., "<docId>-<idx>")
      attractions: cleanedAttractions,        // keep ids if provided (can be empty)
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),

      // denormalized names
      flight_name: flightName || null,
      hotel_name: hotelName || null,
      attraction_names: finalAttractionNames || [], // 👈 auto-filled when selectAllCityAttractions is true
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
// PATCH: Attractions — prefer stored names; else resolve via native helper
// Attractions — prefer stored names; else resolve via native helper
// Attractions — prefer stored names; else resolve via native helper
let attractionNames = [];
if (storedAttractions.length > 0) {
  attractionNames = storedAttractions;
} else if (Array.isArray(order.attractions) && order.attractions.length > 0) {
  const idStrings = order.attractions
    .map(a => (typeof a === "string" ? a : a?.toString?.()))
    .filter(Boolean);

  if (idStrings.length) {
    const docs = await safeDbOperation(() => getAttractionsByIds(idStrings), []);
    attractionNames = (docs || [])
      .map(d => d?.name || d?.title || d?.label)
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

export async function getOrderReceiptPdf(req, res) {
  try {
    // ========== VALIDATION ==========
    const { id } = req.params;
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const db = await getDb();
    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ========== RESOLVE NAMES FROM IDs ==========
    let departureCityName = order.departure_city_name || "Not specified";
    let destinationCityName = order.destination_city_name || "Not specified";
    let flightName = order.flight_name || "Not specified";
    let hotelName = order.hotel_name || "Not specified";

    // If we only have IDs, resolve them to names
    if (!departureCityName || departureCityName === "Not specified") {
      const depCityId = cleanId(order.departure_city_id);
      if (depCityId) {
        const depCity = await safeDbOperation(() => City.findById(depCityId), null);
        departureCityName = depCity?.city || depCity?.name || `City (${depCityId})`;
      }
    }

    if (!destinationCityName || destinationCityName === "Not specified") {
      const dstCityId = cleanId(order.destination_city_id);
      if (dstCityId) {
        const dstCity = await safeDbOperation(() => City.findById(dstCityId), null);
        destinationCityName = dstCity?.city || dstCity?.name || `City (${dstCityId})`;
      }
    }

    if (!flightName || flightName === "Not specified") {
      const flightObjectId = cleanId(order.flight_id);
      const flightIndex = extractIndex(order.flight_id);
      if (flightObjectId) {
        const flightDoc = await safeDbOperation(() => Flight.findById(flightObjectId), null);
        flightName = getFlightName(flightDoc, flightIndex);
      }
    }

    if (!hotelName || hotelName === "Not specified") {
      const hotelObjectId = cleanId(order.hotel_id);
      const hotelIndex = extractIndex(order.hotel_id);
      if (hotelObjectId) {
        const hotelDoc = await safeDbOperation(() => Hotel.findById(hotelObjectId), null);
        hotelName = getHotelName(hotelDoc, hotelIndex);
      }
    }

    // Handle attractions - prefer stored names, fallback to resolving IDs
    let attractionsList = "Not specified";
    if (Array.isArray(order.attraction_names) && order.attraction_names.length > 0) {
      attractionsList = order.attraction_names.join(" • ");
    } else if (Array.isArray(order.attractions) && order.attractions.length > 0) {
      const attractionDocs = await safeDbOperation(
        () => getAttractionsByIds(order.attractions),
        []
      );
      if (attractionDocs && attractionDocs.length > 0) {
        const names = attractionDocs
          .map(doc => doc?.name || doc?.title || doc?.label)
          .filter(Boolean);
        attractionsList = names.length > 0 ? names.join(" • ") : "Not specified";
      }
    }

    // ========== PDF DATA ==========
    const totalAmount = Number(order.total_price ?? 0);
    const createdDate = new Date(order.created_at || Date.now());
    const orderId = String(order._id);

    // ========== RESPONSE HEADERS ==========
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ai-tripper-receipt-${destinationCityName.toLowerCase().replace(/\s+/g, "-")}-${createdDate.getFullYear()}.pdf"`
    );

    // ========== PDF SETUP ==========
    const doc = new pdfkit({ 
      size: "A4", 
      margin: 50,
      info: {
        Title: "AI Tripper - Travel Receipt",
        Author: "AI Tripper",
        Subject: "Travel Booking Receipt",
        Creator: "AI Tripper Platform"
      }
    });
    doc.pipe(res);

    // ========== DESIGN THEME ==========
    const colors = {
      primary: "#1e40af",      // Professional blue
      secondary: "#64748b",    // Slate gray
      success: "#059669",      // Emerald
      background: "#f8fafc",   // Light background
      text: "#1f2937",         // Dark text
      textLight: "#6b7280",    // Light text
      border: "#e2e8f0",       // Border
      white: "#ffffff"
    };

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // ========== HELPER FUNCTIONS ==========
    const addSection = (title, y, height = 120) => {
      // Card background
      doc.rect(margin, y, contentWidth, height)
         .fill(colors.white)
         .stroke(colors.border);
      
      // Section header
      doc.rect(margin, y, contentWidth, 30)
         .fill(colors.background);
      
      doc.fillColor(colors.primary)
         .font("Helvetica-Bold")
         .fontSize(12)
         .text(title, margin + 15, y + 10);
      
      return y + 40; // Return content start position
    };

    const addField = (label, value, x, y, options = {}) => {
      const { bold = false, color = colors.text, fontSize = 10 } = options;
      
      doc.fillColor(colors.textLight)
         .font("Helvetica")
         .fontSize(8)
         .text(label.toUpperCase(), x, y);
      
      doc.fillColor(color)
         .font(bold ? "Helvetica-Bold" : "Helvetica")
         .fontSize(fontSize)
         .text(String(value), x, y + 12);
      
      return y + 35;
    };

    // ========== HEADER SECTION ==========
    let currentY = 0;
    
    // Header background
    doc.rect(0, 0, pageWidth, 100).fill(colors.primary);
    
    // Company info
    doc.fillColor(colors.white)
       .font("Helvetica-Bold")
       .fontSize(32)
       .text("AI TRIPPER", margin, 25);
    
    doc.font("Helvetica")
       .fontSize(14)
       .text("Travel Booking Receipt", margin, 60);
    
    // Receipt info (right side)
    doc.font("Helvetica")
       .fontSize(10)
       .text("RECEIPT #", pageWidth - margin - 120, 25, { width: 120, align: "right" });
    
    doc.font("Helvetica-Bold")
       .fontSize(12)
       .text(orderId.slice(-12).toUpperCase(), pageWidth - margin - 120, 40, { width: 120, align: "right" });
    
    doc.font("Helvetica")
       .fontSize(9)
       .text(createdDate.toLocaleDateString("en-US", {
         year: "numeric",
         month: "long", 
         day: "numeric"
       }), pageWidth - margin - 120, 55, { width: 120, align: "right" });

    currentY = 130;

    // ========== BOOKING DETAILS SECTION ==========
    const detailsY = addSection("BOOKING DETAILS", currentY, 140);
    
    addField("Departure City", departureCityName, margin + 20, detailsY);
    addField("Destination City", destinationCityName, margin + 20, detailsY + 35);
    addField("Travel Date", createdDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric", 
      month: "long",
      day: "numeric"
    }), margin + 20, detailsY + 70);

    currentY += 160;

    // ========== SERVICES SECTION ==========
    const servicesY = addSection("TRAVEL SERVICES", currentY, 140);
    
    addField("Flight", flightName, margin + 20, servicesY);
    addField("Hotel", hotelName, margin + 20, servicesY + 35);
    addField("Attractions", attractionsList, margin + 20, servicesY + 70);

    currentY += 160;

    // ========== PAYMENT SECTION ==========  
    const paymentY = addSection("PAYMENT INFORMATION", currentY, 100);
    
    addField("Payment Method", order.payment_method || "Credit Card", margin + 20, paymentY);
    addField("Transaction ID", `TXN-${orderId.slice(-10).toUpperCase()}`, margin + 20, paymentY + 35);

    currentY += 120;

    // ========== TOTAL AMOUNT SECTION ==========
    doc.rect(margin, currentY, contentWidth, 80)
       .fill(colors.success);
    
    doc.fillColor(colors.white)
       .font("Helvetica-Bold")
       .fontSize(16)
       .text("TOTAL PAID", margin + 20, currentY + 20);
    
    doc.fontSize(32)
       .text(`$${totalAmount.toFixed(2)}`, margin + 20, currentY + 40);
    
    // Paid status badge
    doc.rect(pageWidth - margin - 100, currentY + 25, 80, 30)
       .fill(colors.white);
    
    doc.fillColor(colors.success)
       .fontSize(14)
       .text("✓ PAID", pageWidth - margin - 100, currentY + 35, { 
         width: 80, 
         align: "center" 
       });

    currentY += 100;

    // ========== IMPORTANT NOTES ==========
    const notesY = addSection("IMPORTANT INFORMATION", currentY, 80);
    
    doc.fillColor(colors.textLight)
       .font("Helvetica")
       .fontSize(9)
       .text("• This receipt serves as confirmation of your booking with AI Tripper", margin + 20, notesY)
       .text("• Please keep this receipt for your travel records", margin + 20, notesY + 15)  
       .text("• For support or changes, contact us at support@aitripper.com", margin + 20, notesY + 30);

    // ========== FOOTER ==========
    const footerY = pageHeight - 60;
    
    doc.rect(0, footerY - 20, pageWidth, 80)
       .fill(colors.background);
    
    doc.fillColor(colors.primary)
       .font("Helvetica-Bold")
       .fontSize(14)
       .text("Thank you for choosing AI Tripper!", margin, footerY, {
         width: contentWidth,
         align: "center"
       });
    
    doc.fillColor(colors.textLight)
       .font("Helvetica")
       .fontSize(9)
       .text(`Generated on ${new Date().toLocaleString()}`, margin, footerY + 25, {
         width: contentWidth,
         align: "center"  
       });

    // ========== FINALIZE PDF ==========
    doc.end();

  } catch (err) {
    console.error("❌ PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: "Failed to generate receipt PDF",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  }
}
