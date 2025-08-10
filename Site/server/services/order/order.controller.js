import Order from './order.model.js';
import pdfkit from "pdfkit";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";

// ===== Helper Functions =====

// Validate ObjectId format
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
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
