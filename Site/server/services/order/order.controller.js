// Updated order.controller.js

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

// Clean compound IDs
function cleanId(id) {
  if (!id) return null;
  if (typeof id === 'string') {
    const cleaned = id.split(/[-_]/)[0];
    return isValidObjectId(cleaned) ? cleaned : null;
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

function extractCityId(compoundId) {
  if (typeof compoundId !== 'string') return null;
  return compoundId.split(/[-_]/)[0];
}

// Helper function to safely get flight name
function getFlightName(flight, index) {
  if (!flight) return "Flight not found";
  
  console.log("🔍 Flight data:", flight);
  console.log("🔍 Requested index:", index);
  
  // Check different possible structures
  if (flight.airlines && Array.isArray(flight.airlines)) {
    const selectedFlight = flight.airlines[index];
    console.log("✈️ Selected flight from airlines:", selectedFlight);
    return selectedFlight?.name || selectedFlight?.airline || `Flight ${index + 1}`;
  }
  
  if (flight.flights && Array.isArray(flight.flights)) {
    const selectedFlight = flight.flights[index];
    console.log("✈️ Selected flight from flights:", selectedFlight);
    return selectedFlight?.name || selectedFlight?.airline || `Flight ${index + 1}`;
  }
  
  // If it's a direct flight object
  if (flight.name) return flight.name;
  if (flight.airline) return flight.airline;
  
  return "Unknown Flight";
}

// Helper function to safely get hotel name
function getHotelName(hotel, index) {
  if (!hotel) return "Hotel not found";
  
  console.log("🔍 Hotel data:", hotel);
  console.log("🔍 Requested index:", index);
  
  // Check different possible structures
  if (hotel.hotels && Array.isArray(hotel.hotels)) {
    const selectedHotel = hotel.hotels[index];
    console.log("🏨 Selected hotel from hotels:", selectedHotel);
    return selectedHotel?.name || selectedHotel?.hotelName || `Hotel ${index + 1}`;
  }
  
  if (hotel.accommodations && Array.isArray(hotel.accommodations)) {
    const selectedHotel = hotel.accommodations[index];
    console.log("🏨 Selected hotel from accommodations:", selectedHotel);
    return selectedHotel?.name || selectedHotel?.hotelName || `Hotel ${index + 1}`;
  }
  
  // If it's a direct hotel object
  if (hotel.name) return hotel.name;
  if (hotel.hotelName) return hotel.hotelName;
  
  return "Unknown Hotel";
}

// POST /api/order
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
    if (!departureCityId)   missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!flightId)          missing.push('flightId');
    if (!hotelId)           missing.push('hotelId');
    if (!paymentMethod)     missing.push('paymentMethod');
    if (totalPrice === undefined || totalPrice === null) missing.push('totalPrice');
    
    if (missing.length) {
      console.error("❌ Missing required fields:", missing);
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    // Clean and validate IDs
    const depClean = cleanId(departureCityId);
    const dstClean = cleanId(destinationCityId);
    const fltClean = cleanId(flightId);
    const htlClean = cleanId(hotelId);

    if (!depClean || !dstClean || !fltClean || !htlClean) {
      console.error("❌ Invalid ID format:", {
        departureCityId, destinationCityId, flightId, hotelId
      });
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Clean attraction IDs
    const cleanedAttractions = Array.isArray(attractions)
      ? attractions.map(a => cleanId(a)).filter(Boolean)
      : [];

    // Create new order instance - store the FULL compound IDs
    const newOrder = new Order({
      user_id: String(req.user.id),
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: flightId, // Store full compound ID (e.g., "flight_id-2")
      hotel_id: hotelId,   // Store full compound ID (e.g., "hotel_id-1")
      attractions: cleanedAttractions,
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
    });

    console.log("💾 Saving new order:", newOrder);

    const savedOrder = await newOrder.save();

    // Build response object
    const responseOrder = {
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
    };

    console.log("✅ Order saved successfully:", responseOrder._id);

    return res.status(201).json(responseOrder);

  } catch (err) {
    console.error("❌ Error creating order:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET /api/order
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

        const [
          departureCity,
          destinationCity,
          flight,
          hotel,
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

        // Get flight and hotel names using helper functions
        const flightName = getFlightName(flight, flightIndex);
        const hotelName = getHotelName(hotel, hotelIndex);

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