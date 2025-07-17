// Updated order.controller.js

import Order from './order.model.js';
import { v4 as uuidv4 } from "uuid";
import pdfkit from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import City from "../cities/cities.model.js";
import Flight from "../flights/flights.model.js";
import Hotel from "../hotel/hotel.model.js";
import Attraction from "../attraction/att.model.js";

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDir = path.join(__dirname, "../../data/pdfs");
if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

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

// Enhanced PDF generation with better error handling
async function generateOrderPDF(order, username) {
  try {
    const orderId = order._id.toString();
    const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
    const doc = new pdfkit({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // Fetch related data
    const [departureCity, destinationCity, flight, hotel, attractions] = await Promise.all([
      City.findById(order.departure_city_id).catch(() => null),
      City.findById(order.destination_city_id).catch(() => null),
      Flight.findById(order.flight_id).catch(() => null),
      Hotel.findById(order.hotel_id).catch(() => null),
      order.attractions.length > 0 
        ? Promise.all(order.attractions.map(id => Attraction.findById(id).catch(() => null)))
        : Promise.resolve([])
    ]);

    // Header
    doc.font("Helvetica-Bold").fontSize(24).fillColor("#1F618D")
       .text("PathMakers - Travel Receipt", { align: "center" });
    doc.moveDown().fontSize(14).fillColor("black")
       .text(`Order ID: ${orderId}`, { align: "center" })
       .text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" })
       .moveDown(1.5);

    // Customer Details
    doc.font("Helvetica-Bold").fontSize(16).text("Customer Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Username: ${username}`).moveDown();

    // Flight Details
    doc.font("Helvetica-Bold").fontSize(16).text("Flight Details", { underline: true });
    doc.font("Helvetica").fontSize(12)
       .text(`From: ${departureCity?.city || 'N/A'}`)
       .text(`To: ${destinationCity?.city || 'N/A'}`)
       .text(`Flight: ${flight?.airline || 'N/A'} - $${flight?.price || 0}`)
       .moveDown();

    // Hotel Details
    doc.font("Helvetica-Bold").fontSize(16).text("Hotel Details", { underline: true });
    doc.font("Helvetica").fontSize(12)
       .text(`Hotel: ${hotel?.name || 'N/A'} - $${hotel?.price || 0}/night`)
       .moveDown();

    // Attractions
    doc.font("Helvetica-Bold").fontSize(16).text("Attractions", { underline: true });
    if (attractions.length > 0) {
      attractions.forEach(attr => {
        if (attr) {
          doc.font("Helvetica").fontSize(12)
             .text(`• ${attr.name} - $${attr.price || 0}`);
        }
      });
    } else {
      doc.font("Helvetica").fontSize(12).text("No attractions selected");
    }
    doc.moveDown();

    // Transportation & Payment
    doc.font("Helvetica-Bold").fontSize(16).text("Transportation", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Mode: ${order.transportation || 'N/A'}`).moveDown();

    doc.font("Helvetica-Bold").fontSize(16).text("Payment Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Method: ${order.payment_method}`);
    doc.fontSize(14).fillColor("#E74C3C")
       .text(`Total Price: $${order.total_price}`, { align: "right" });

    // Footer
    doc.fillColor("black").moveDown(2)
       .font("Helvetica-Oblique").fontSize(10).fillColor("#555")
       .text("Thank you for booking with PathMakers!", { align: "center" });

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`✅ PDF generated successfully: ${pdfPath}`);
        resolve(pdfPath);
      });
      stream.on('error', (err) => {
        console.error(`❌ PDF generation failed: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error("❌ PDF generation error:", error);
    throw error;
  }
}

// ===== Controller Functions =====

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
    const orderObj = savedOrder.toObject();
    
    console.log("✅ Order saved successfully:", orderObj._id);
    
    // Generate PDF in background (don't block response)
    generateOrderPDF(orderObj, req.user.username || req.user.name || 'User')
      .catch(err => console.error("Background PDF generation error:", err));

    res.status(201).json(orderObj);

  } catch (err) {
    console.error("❌ Error creating order:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// GET /api/order/:orderId/pdf
export async function getOrderPDF(req, res) {
  try {
    const orderId = req.params.orderId;
    const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
    
    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      // Try to regenerate PDF
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Generate PDF if it doesn't exist
      try {
        await generateOrderPDF(order, req.user.username || req.user.name || 'User');
      } catch (pdfError) {
        console.error("❌ PDF generation failed:", pdfError);
        return res.status(500).json({ message: "PDF generation failed" });
      }
    }
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="order-${orderId}.pdf"`);
    
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
    
    stream.on('error', (err) => {
      console.error("❌ PDF stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "PDF streaming failed" });
      }
    });
    
  } catch (err) {
    console.error("❌ getOrderPDF error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

// GET /api/order
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  
  try {
    const userId = String(req.user.id);
    const orders = await Order.find({ user_id: userId }).lean();
    console.log(" Retrieved orders:", orders.length);
    return res.status(200).json(orders);
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}