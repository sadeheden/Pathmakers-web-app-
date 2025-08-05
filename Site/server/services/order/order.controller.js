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
function extractIndex(compoundId) {
  if (typeof compoundId !== 'string') return 0;
  const parts = compoundId.split(/[-_]/);
  return parts.length > 1 ? parseInt(parts[1], 10) : 0;
}

function extractCityId(compoundId) {
  if (typeof compoundId !== 'string') return null;
  return compoundId.split(/[-_]/)[0];
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

    // Create new order instance
    const newOrder = new Order({
      user_id: String(req.user.id),
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: fltClean,
      hotel_id: htlClean,
      attractions: cleanedAttractions,
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
    });

    console.log("💾 Saving new order:", newOrder);

    const savedOrder = await newOrder.save();

    // בניית אובייקט תגובה פשוט עם כל השדות הדרושים במחרוזות
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
    const [
      departureCity,
      destinationCity,
      flight,
      hotel,
      attractions
    ] = await Promise.all([
      City.findById(order.departure_city_id).catch(() => null),
      City.findById(order.destination_city_id).catch(() => null),
      Flight.findById(cleanId(order.flight_id)).catch(() => null),
Hotel.findById(cleanId(order.hotel_id)).catch(() => null),
      order.attractions?.length
        ? Promise.all(order.attractions.map(id => Attraction.findById(id).catch(() => null)))
        : []
        
    ]);

const flightIndex = extractIndex(order.flight_id);
const hotelIndex = extractIndex(order.hotel_id);

const selectedFlight = flight?.airlines?.[flightIndex] || null;
const selectedHotel = hotel?.hotels?.[hotelIndex] || null;

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
          departure_city_name: departureCity?.city || "Unknown",
          destination_city_name: destinationCity?.city || "Unknown",
flight_name: selectedFlight?.name || "Unknown",
hotel_name: selectedHotel?.name || "Unknown",
          attraction_names: attractions
            ? attractions.filter(Boolean).map(a => a.name)
            : [],
        };
      })
    );

    return res.status(200).json({ success: true, orders: enrichedOrders });

  } catch (err) {
    console.error("❌ Error fetching enriched orders:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
