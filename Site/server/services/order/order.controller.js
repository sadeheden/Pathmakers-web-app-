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

    // Create new order
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

    const savedOrder = await newOrder.save();
  const orderObj = savedOrder;

    
    console.log("✅ Order saved successfully:", orderObj._id);
    
   
   const responseOrder = {
  ...orderObj,
  _id: orderObj._id.toString(),
  user_id: orderObj.user_id?.toString?.() || null,
  departure_city_id: orderObj.departure_city_id?.toString?.() || null,
  destination_city_id: orderObj.destination_city_id?.toString?.() || null,
  flight_id: orderObj.flight_id?.toString?.() || null,
  hotel_id: orderObj.hotel_id?.toString?.() || null,
  attractions: orderObj.attractions?.map(a => a.toString?.()) || []
};

res.status(201).json(responseOrder);


  } catch (err) {
    console.error("❌ Error creating order:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET /api/order/:orderId/pdf
// GET /api/order/:orderId/pdf
export async function getOrderPDF(req, res) {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [departureCity, destinationCity, flight, hotel, attractions] = await Promise.all([
      City.findById(order.departure_city_id).catch(() => null),
      City.findById(order.destination_city_id).catch(() => null),
      Flight.findById(order.flight_id).catch(() => null),
      Hotel.findById(order.hotel_id).catch(() => null),
      order.attractions.length > 0
        ? Promise.all(order.attractions.map(id => Attraction.findById(id).catch(() => null)))
        : Promise.resolve([])
    ]);

    // Set headers to stream the PDF directly
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="order-${orderId}.pdf"`);

    // Create and stream the PDF directly
    const doc = new pdfkit({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.pipe(res); // 📢 No saving to file system, directly to browser

    // PDF content
    doc.font("Helvetica-Bold").fontSize(24).fillColor("#1F618D")
      .text("PathMakers - Travel Receipt", { align: "center" });
    doc.moveDown().fontSize(14).fillColor("black")
      .text(`Order ID: ${orderId}`, { align: "center" })
      .text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" })
      .moveDown(1.5);

    doc.font("Helvetica-Bold").fontSize(16).text("Customer Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Username: ${req.user?.username || req.user?.name || 'User'}`).moveDown();

    doc.font("Helvetica-Bold").fontSize(16).text("Flight Details", { underline: true });
    doc.font("Helvetica").fontSize(12)
      .text(`From: ${departureCity?.city || 'N/A'}`)
      .text(`To: ${destinationCity?.city || 'N/A'}`)
      .text(`Flight: ${flight?.airline || 'N/A'} - $${flight?.price || 0}`).moveDown();

    doc.font("Helvetica-Bold").fontSize(16).text("Hotel Details", { underline: true });
    doc.font("Helvetica").fontSize(12)
      .text(`Hotel: ${hotel?.name || 'N/A'} - $${hotel?.price || 0}/night`).moveDown();

    doc.font("Helvetica-Bold").fontSize(16).text("Attractions", { underline: true });
    if (attractions.length > 0) {
      attractions.forEach(attr => {
        if (attr) doc.font("Helvetica").fontSize(12).text(`• ${attr.name} - $${attr.price || 0}`);
      });
    } else {
      doc.font("Helvetica").fontSize(12).text("No attractions selected");
    }

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(16).text("Transportation", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Mode: ${order.transportation || 'N/A'}`).moveDown();

    doc.font("Helvetica-Bold").fontSize(16).text("Payment Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Method: ${order.payment_method}`);
    doc.fontSize(14).fillColor("#E74C3C")
      .text(`Total Price: $${order.total_price}`, { align: "right" });

    doc.fillColor("black").moveDown(2)
      .font("Helvetica-Oblique").fontSize(10).fillColor("#555")
      .text("Thank you for booking with PathMakers!", { align: "center" });

    doc.end(); // ✅ Important: ends the stream

  } catch (err) {
    console.error("❌ getOrderPDF error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}


// GET /api/order
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
          Flight.findById(order.flight_id).catch(() => null),
          Hotel.findById(order.hotel_id).catch(() => null),
          order.attractions?.length
            ? Promise.all(order.attractions.map(id => Attraction.findById(id).catch(() => null)))
            : []
        ]);

        return {
          ...order,
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
          flight_name: flight?.airline || "Unknown",
          hotel_name: hotel?.name || "Unknown",
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
