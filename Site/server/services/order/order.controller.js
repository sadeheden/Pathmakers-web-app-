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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="order-${orderId}.pdf"`);

    const doc = new pdfkit({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    doc.pipe(res);

    // צבעים
    const primaryColor = "#2A3E5B";  // כחול כהה מודרני
    const secondaryColor = "#F4F7FA"; // רקע בהיר
    const accentColor = "#FF6F61";   // אדום כתום למגע עיצובי
    const textColor = "#333333";

    // פונקציה לעיצוב קופסאות תוכן
    function drawBox(x, y, width, height) {
      doc
        .roundedRect(x, y, width, height, 8)
        .fillOpacity(0.07)
        .fill(secondaryColor)
        .strokeColor(primaryColor)
        .lineWidth(1)
        .stroke()
        .fillOpacity(1);
    }

    // --- HEADER ---
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(28)
      .text("PathMakers", { align: "center" });

    doc
      .moveDown(0.2)
      .fontSize(16)
      .fillColor(textColor)
      .text("Travel Receipt", { align: "center" })
      .moveDown(1.5);

    // --- Order info bar ---
    const orderInfoY = doc.y;
    drawBox(50, orderInfoY - 5, 500, 60);
    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Order ID:", 60, orderInfoY);
    doc
      .font("Helvetica")
      .text(orderId, 130, orderInfoY);

    doc
      .font("Helvetica-Bold")
      .text("Date:", 350, orderInfoY);
    doc
      .font("Helvetica")
      .text(new Date(order.created_at).toLocaleDateString(), 390, orderInfoY);

    doc.moveDown(4);

    // --- CUSTOMER DETAILS BOX ---
    let sectionY = doc.y;
    drawBox(50, sectionY - 5, 500, 60);
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Customer Details", 60, sectionY);
    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(textColor)
      .text(`Username: ${req.user?.username || req.user?.name || "User"}`, 60, sectionY + 25);

    doc.moveDown(5);

    // --- FLIGHT & HOTEL DETAILS side by side ---
    const colWidth = 240;
    sectionY = doc.y;

    // Flight Box
    drawBox(50, sectionY - 5, colWidth, 120);
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Flight Details", 60, sectionY);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(textColor)
      .text(`From: ${departureCity?.city || "N/A"}`, 60, sectionY + 25)
      .text(`To: ${destinationCity?.city || "N/A"}`, 60, sectionY + 45)
      .text(`Airline: ${flight?.airline || "N/A"}`, 60, sectionY + 65)
      .text(`Price: $${flight?.price?.toFixed(2) || "0.00"}`, 60, sectionY + 85);

    // Hotel Box
    drawBox(310, sectionY - 5, colWidth, 120);
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Hotel Details", 320, sectionY);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(textColor)
      .text(`Name: ${hotel?.name || "N/A"}`, 320, sectionY + 25)
      .text(`Price/night: $${hotel?.price?.toFixed(2) || "0.00"}`, 320, sectionY + 45);

    doc.moveDown(7);

    // --- ATTRACTIONS (full width) ---
    sectionY = doc.y;
    const boxHeight = Math.max(60, 20 * (attractions.length || 1));
    drawBox(50, sectionY - 5, 500, boxHeight + 30);

    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Attractions", 60, sectionY);

    doc.font("Helvetica").fontSize(12).fillColor(textColor);
    if (attractions.length > 0) {
      let yOffset = sectionY + 25;
      attractions.forEach(attr => {
        if (attr) {
          doc.text(`• ${attr.name} - $${attr.price?.toFixed(2) || "0.00"}`, 60, yOffset);
          yOffset += 20;
        }
      });
    } else {
      doc
        .font("Helvetica-Oblique")
        .fillColor("#999999")
        .text("No attractions selected", 60, sectionY + 25);
    }

    doc.moveDown(7);

    // --- TRANSPORTATION ---
    sectionY = doc.y;
    drawBox(50, sectionY - 5, 500, 50);
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Transportation", 60, sectionY);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(textColor)
      .text(order.transportation || "N/A", 60, sectionY + 25);

    doc.moveDown(5);

    // --- PAYMENT DETAILS ---
    sectionY = doc.y;
    drawBox(50, sectionY - 5, 500, 70);
    doc
      .fillColor(primaryColor)
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Payment Details", 60, sectionY);

    doc
      .font("Helvetica")
      .fontSize(12)
      .fillColor(textColor)
      .text(`Method: ${order.payment_method}`, 60, sectionY + 25);

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(accentColor)
      .text(`Total Price: $${order.total_price.toFixed(2)}`, 400, sectionY + 20, { align: "right" });

    // --- FOOTER ---
    doc.moveDown(5);
    doc
      .fontSize(10)
      .fillColor("#AAAAAA")
      .font("Helvetica-Oblique")
      .text("Thank you for booking with PathMakers.", { align: "center" });

    doc.end();

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
