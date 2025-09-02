import Order from './order.model.js';
import path from "path";
import { getAttractionsByIds,getAllAttractionNamesForCity  } from "../attraction/att.db.js"; // ← adjust path if needed
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import { MongoClient, ObjectId } from "mongodb"; // you already import ObjectId; extend it
import { findOverlappingOrdersByUser } from "./order.db.js";
const uri = process.env.CONNECTION_STRING;
const dbName = process.env.DB_NAME;
 if (!dbName) {
   throw new Error("Missing DB_NAME env var (controller). It must match order.db.js");
}
console.log("[controller] Using DB:", dbName);
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

// put near top of controller, after getDb()
async function findOneById(colName, id) {
  if (!id || !ObjectId.isValid(id)) return null;
  const db = await getDb();
  return db.collection(colName).findOne({ _id: new ObjectId(id) });
}

// Cities can be in "cities" or "city"
async function findCityNative(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  const db = await getDb();
  let doc = await db.collection("cities").findOne({ _id: new ObjectId(id) });
  if (!doc) doc = await db.collection("city").findOne({ _id: new ObjectId(id) });
  return doc;
}

// Parse "YYYY-MM-DD" safely to noon UTC (stable across timezones)
function ymdToNoonUTC(v) {
  if (!v) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const Y = Number(m[1]), M = Number(m[2]), D = Number(m[3]);
  return new Date(Date.UTC(Y, M - 1, D, 12, 0, 0));
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
    // --- Hotel ---
const parsedHotel = parseCompound(hotelRaw);
let hotelDoc = null;
let hotelIndex = parsedHotel.idx;

// ✅ build a destination filter that works whether the field is stored as ObjectId or string
const dstIdStr = String(dstCity._id);
const dstIdObj = new ObjectId(dstIdStr);
const destFilter = { $or: [ { destination_city_id: dstIdObj }, { destination_city_id: dstIdStr } ] };

if (is24(parsedHotel.base)) {
  hotelDoc = await Hotels.findOne({ _id: new ObjectId(parsedHotel.base) });
} else if (parsedHotel.base) {
  const needle = parsedHotel.base.replace(/\([^)]*\)/g, "").split(" - ")[0].trim();
  hotelDoc = await Hotels.findOne({
    $and: [
      destFilter,
      { $or: [ { name: needle }, { "hotels.name": needle } ] }
    ]
  });
}

if (!hotelDoc) {
  hotelDoc = await Hotels.findOne(destFilter);
}

if (!hotelDoc) {
  // fallback – no hotel found, create a dummy carrying the city id
  hotelDoc = { _id: dstCity._id };
  hotelIndex = 0;
}

const ids = {
  departureCityId: String(depCity._id),
  destinationCityId: String(dstCity._id),
  flightId: flightCompoundId,
  hotelId: `${String(hotelDoc._id)}-${hotelIndex}`,
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
      destinationCityName ,           // optional helpful fallback (string)
    tripStartDate,
    tripEndDate,
    tripDate,
    returnDate} = req.body;

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
    // 🔎 Resolve city names at save time
const depCityDoc = depClean ? await findCityNative(depClean) : null;
const dstCityDoc = dstClean ? await findCityNative(dstClean) : null;

const departureCityNameResolved = depCityDoc?.city || depCityDoc?.name || null;
const destinationCityNameResolved = dstCityDoc?.city || dstCityDoc?.name || null;

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

// --- inside createOrder ---

// 1) tiny, safe parser (keeps calendar day stable in all timezones)
function toDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // UTC noon
  }
  const dte = new Date(s);
  return isNaN(dte) ? null : dte;
}

// read whatever keys the client may send
const startDt = toDate(tripStartDate ?? tripDate);
const endDt   = toDate(tripEndDate   ?? returnDate);

console.log("📅 Parsed trip dates:", { startDt, endDt });
// 🔒 Block overlapping trips for this user (pre-save guard)
if (startDt && endDt) {
try {
    const overlaps = await findOverlappingOrdersByUser(String(req.user.id), startDt, endDt);
    if (overlaps.length) {
      const e = overlaps[0];
      return res.status(409).json({
        conflict: true,
        message: `You already have a trip from ${
          new Date(e.trip_start_date ?? e.tripDate).toLocaleDateString()
        } to ${
          new Date(e.trip_end_date ?? e.returnDate).toLocaleDateString()
        }${e.destination_city_name ? ` (to ${e.destination_city_name})` : ""}.`,
      });
    }
  } catch (err) {
    console.error("Conflict lookup failed:", err?.message || err);
    // don't block on lookup failure; you can choose to 500 here if you prefer strict behavior
  }
}

// 2) (optional) require dates
// if (!startDt || !endDt) {
//   return res.status(400).json({ message: "Trip dates are required" });
// }

// 3) include dates when creating the order
const newOrder = new Order({
  user_id: ObjectId.isValid(req.user.id) ? new ObjectId(req.user.id) : String(req.user.id),
  departure_city_id: depClean,
  destination_city_id: dstClean,
  flight_id: flightId,
  hotel_id: hotelId,
  attractions: cleanedAttractions,
  transportation,
  payment_method: paymentMethod,
  total_price: totalPrice,
  created_at: new Date(),

  flight_name: flightName || null,
  hotel_name: hotelName || null,
  attraction_names: finalAttractionNames || [],
  departure_city_name: departureCityNameResolved || null,
  destination_city_name: destinationCityNameResolved || null,

  // 🔴 do not forget these:
  trip_start_date: startDt,
  trip_end_date:   endDt,
});

console.log("Saving order to database:", newOrder.toObject ? newOrder.toObject() : newOrder);

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
         trip_start_date: savedOrder.trip_start_date ?? null,
      trip_end_date:   savedOrder.trip_end_date   ?? null,
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

const [departureCity, destinationCity, flightDoc, hotelDoc] = await Promise.all([
  hasStoredDepartureCity ? null : findCityNative(depCityObjectId),
  hasStoredDestinationCity ? null : findCityNative(dstCityObjectId),
  hasStoredFlightName ? null : findOneById("flights", flightObjectId),
  hasStoredHotelName ? null : findOneById("hotels",  hotelObjectId),
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
          flight_name: flightName,
          hotel_name: hotelName,
          attraction_names: attractionNames,
             trip_start_date: asObj.trip_start_date ?? null,
          trip_end_date:   asObj.trip_end_date   ?? null,
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

// === REPLACE ENTIRE getOrderReceiptPdf WITH THIS ===
export async function getOrderReceiptPdf(req, res) {
  try {
    const { id } = req.params;
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const db = await getDb();
  const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
if (!order) return res.status(404).json({ message: "Order not found" });

// ✅ Normalize trip dates immediately after fetching the order
order.trip_start_date = order.trip_start_date ? new Date(order.trip_start_date) : null;
order.trip_end_date   = order.trip_end_date   ? new Date(order.trip_end_date)   : null;

    // ---------- Resolve display values to mirror .summary-details ----------
    // We reuse your helpers so IDs -> human names work.
    let departureCityName = order.departure_city_name || "";
    let destinationCityName = order.destination_city_name || "";
    let flightName = order.flight_name || "";
    let hotelName  = order.hotel_name  || "";

    // Resolve city names if not stored
   if (!departureCityName) {
  const depId = cleanId(order.departure_city_id);
  if (depId) {
    const depDoc = await findCityNative(depId);
    departureCityName = depDoc?.city || depDoc?.name || "";
  }
}
if (!destinationCityName) {
  const dstId = cleanId(order.destination_city_id);
  if (dstId) {
    const dstDoc = await findCityNative(dstId);
    destinationCityName = dstDoc?.city || dstDoc?.name || "";
  }
}
// Flights/Hotels:
if (!flightName) {
  const fId = cleanId(order.flight_id);
  const fIdx = extractIndex(order.flight_id);
  if (fId) {
    const fDoc = await findOneById("flights", fId);
    flightName = getFlightName(fDoc, fIdx);
  }
}
if (!hotelName) {
  const hId = cleanId(order.hotel_id);
  const hIdx = extractIndex(order.hotel_id);
  if (hId) {
    const hDoc = await findOneById("hotels", hId);
    hotelName = getHotelName(hDoc, hIdx);
  }
}


    // Attractions — prefer stored names; else keep empty (to match summary)
    let attractionsList = "";
    if (Array.isArray(order.attraction_names) && order.attraction_names.length) {
      attractionsList = order.attraction_names.join(", ");
    }

    // Transportation, Payment, Total (these are already on the order)
    const transportation = order.transportation || "";
    const paymentMethod  = order.payment_method || "";
    const total          = Number(order.total_price ?? 0);

    // ---------- PDF headers ----------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="trip-summary-${(destinationCityName || "trip").toLowerCase().replace(/\s+/g, "-")}.pdf"`
    );

    const doc = new pdfkit({
      size: "A4",
      margin: 40,
      bufferPages: true,
      info: {
        Title: "Trip Summary",
        Author: "PathMakers",
        Subject: "Trip Summary Receipt",
      },
    });
    doc.pipe(res);

    // ---------- Theme: use your Chat page colors ----------
    const COLORS = {
      brand: "#004e75",       // --brand
      brandHover: "#003b5c",  // --brand-hover
      text: "#0f172a",        // --text
      muted: "#334155",       // approx of rgba(51,65,85,0.9)
      bgPage: "#f9fafb",      // --bg-page
      bgCard: "#ffffff",      // --bg-card
      border: "#e5e7eb",
      line: "#d1d5db",
    };

    const MARGIN = 40;
    const WIDTH  = doc.page.width - MARGIN * 2;

    // Helpers
    const hr = (y) => {
      doc.save()
        .strokeColor(COLORS.line).lineWidth(1)
        .moveTo(MARGIN, y).lineTo(MARGIN + WIDTH, y).stroke()
        .restore();
    };
    const sectionCard = (title, y, height) => {
      // card background
      doc.save()
        .lineWidth(1)
        .rect(MARGIN, y, WIDTH, height).fillAndStroke(COLORS.bgCard, COLORS.border)
        .restore();
      // section header strip
      doc.save()
        .rect(MARGIN, y, WIDTH, 32).fill(COLORS.bgPage)
        .restore();
      doc.fillColor(COLORS.brand).font("Helvetica-Bold").fontSize(12)
        .text(title, MARGIN + 14, y + 10);
      return y + 42; // content start
    };
    const row = (label, value, x, y, w) => {
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted)
        .text(label.toUpperCase(), x, y);
      doc.font("Helvetica").fontSize(11).fillColor(COLORS.text)
        .text(value || "—", x, y + 12, { width: w });
      return y + 38;
    };

    // ---------- Header Banner ----------
    const top = 28;
    doc.save().rect(0, 0, doc.page.width, 90).fill(COLORS.brand).restore();
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22)
      .text("Trip Summary", MARGIN, 28, { width: WIDTH / 2 });
    doc.font("Helvetica").fontSize(10)
      .text(new Date(order.created_at || Date.now()).toLocaleString(), MARGIN, 60);

    // Right header box
    doc.save()
      .lineWidth(1)
      .rect(MARGIN + WIDTH - 180, 28, 180, 54).fillAndStroke("#ffffff", "rgba(255,255,255,0.4)")
      .restore();
    doc.fillColor(COLORS.brandHover).font("Helvetica-Bold").fontSize(10)
      .text("ORDER ID", MARGIN + WIDTH - 170, 36, { width: 160, align: "right" });
    doc.fillColor(COLORS.brandHover).font("Helvetica-Bold").fontSize(14)
      .text(String(order._id).slice(-10).toUpperCase(), MARGIN + WIDTH - 170, 52, { width: 160, align: "right" });

    // ---------- “Your Trip Summary” section (matches .summary-details) ----------
    let y = 120;
    const contentStart = sectionCard("YOUR TRIP SUMMARY", y, 220);
    y = contentStart;

    // Two columns inside card
    const colGap = 24;
    const colW = (WIDTH - colGap) / 2;
    let yL = y, yR = y;

    // Left column values (exact keys from your UI)
    yL = row("From", departureCityName, MARGIN + 16, yL, colW - 32);
    yL = row("To", destinationCityName, MARGIN + 16, yL, colW - 32);
    yL = row("Flight", flightName, MARGIN + 16, yL, colW - 32);
    yL = row("Hotel", hotelName, MARGIN + 16, yL, colW - 32);
const departDisp = order.trip_start_date
  ? new Date(order.trip_start_date).toLocaleDateString()
  : "—";
const returnDisp = order.trip_end_date
  ? new Date(order.trip_end_date).toLocaleDateString()
  : "—";
    // Right column
    yR = row("Attractions", attractionsList, MARGIN + colW + colGap + 16, yR, colW - 32);
    yR = row("Transportation", transportation, MARGIN + colW + colGap + 16, yR, colW - 32);
    yR = row("Payment", paymentMethod, MARGIN + colW + colGap + 16, yR, colW - 32);
const tripStartDisp = order.trip_start_date
  ? order.trip_start_date.toLocaleDateString()
  : "—";

const tripEndDisp = order.trip_end_date
  ? order.trip_end_date.toLocaleDateString()
  : "—";
    yR = row("Trip Start", tripStartDisp, MARGIN + colW + colGap + 16, yR, colW - 32);
    yR = row("Trip End",   tripEndDisp,   MARGIN + colW + colGap + 16, yR, colW - 32);
    // Bottom total strip in the same card
    const cardBottom = Math.max(yL, yR) + 8;
    hr(cardBottom);
    doc.fillColor(COLORS.brand).font("Helvetica-Bold").fontSize(12)
      .text("TOTAL", MARGIN + 16, cardBottom + 12);
    doc.fillColor(COLORS.brand).font("Helvetica-Bold").fontSize(20)
      .text(`$${total.toFixed(2)}`, MARGIN + WIDTH - 16 - 160, cardBottom + 8, { width: 160, align: "right" });

    // ---------- Notes / Footer ----------
    const footerY = cardBottom + 70;
    const noteH = 70;
    const ns = sectionCard("NOTES", footerY, noteH);
    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9)
      .text("This PDF mirrors the summary shown in the chat’s Trip Summary panel.", MARGIN + 16, ns)
      .text("For questions, reply to your booking email or contact support.", MARGIN + 16, ns + 16);

    doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9)
      .text("Thank you for choosing PathMakers!", MARGIN, doc.page.height - 20, { width: WIDTH, align: "center" });

    doc.end();
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate receipt PDF" });
    }
  }
}
// GET /api/order/conflicts?start=YYYY-MM-DD&end=YYYY-MM-DD
export async function hasDateConflict(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });

  const start = ymdToNoonUTC(req.query.start);
  const end   = ymdToNoonUTC(req.query.end);

  if (!start || !end || end < start) {
    return res.status(400).json({ message: "Invalid date range. Use YYYY-MM-DD and ensure start <= end." });
  }

  try {
    const overlaps = await findOverlappingOrdersByUser(String(req.user.id), start, end);
    if (overlaps?.length) {
      return res.status(200).json({
        conflict: true,
        overlaps: overlaps.map(o => ({
           id: String(o._id),
  start: o.trip_start_date ?? o.tripDate,
  end:   o.trip_end_date   ?? o.returnDate,
  destination: o.destination_city_name || "your trip",
        })),
        message: "You already have a trip on these dates.",
      });
    }
    return res.status(200).json({ conflict: false });
  } catch (err) {
    console.error("hasDateConflict error:", err?.message || err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
