// order.controller.js
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

// Validate ObjectId format
function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Clean compound IDs
function cleanId(id) {
  if (!id) return null;
  const cleaned = id.split(/[-_]/)[0];
  return isValidObjectId(cleaned) ? cleaned : null;
}

// GET /api/order
export async function getUserOrders(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  try {
    const userId = String(req.user.id);
    const orders = await Order.findByUserId(userId).lean();
    console.log("🗒 Retrieved orders:", orders);
    return res.status(200).json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

// POST /api/order
export async function createOrder(req, res) {
  if (!req.user?.id) return res.status(401).json({ message: "Unauthorized" });
  try {
    const { departureCityId, destinationCityId, flightId, hotelId, attractions, transportation, paymentMethod, totalPrice } = req.body;
    const missing = [];
    if (!departureCityId)   missing.push('departureCityId');
    if (!destinationCityId) missing.push('destinationCityId');
    if (!flightId)          missing.push('flightId');
    if (!hotelId)           missing.push('hotelId');
    if (!paymentMethod)     missing.push('paymentMethod');
    if (!totalPrice)        missing.push('totalPrice');
    if (missing.length) return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });

    const depClean = cleanId(departureCityId);
    const dstClean = cleanId(destinationCityId);
    const fltClean = cleanId(flightId);
    const htlClean = cleanId(hotelId);
    if (!depClean || !dstClean || !fltClean || !htlClean)
      return res.status(400).json({ message: "Invalid ID format" });

    const newOrder = new Order({
      user_id: String(req.user.id),
      departure_city_id: depClean,
      destination_city_id: dstClean,
      flight_id: fltClean,
      hotel_id: htlClean,
      attractions: Array.isArray(attractions)
        ? attractions.map(a => cleanId(a)).filter(Boolean)
        : [],
      transportation,
      payment_method: paymentMethod,
      total_price: totalPrice,
      created_at: new Date(),
    });

    const saved = await newOrder.save();
    const orderObj = saved.toObject();
    console.log("🗒 Saved order object:", orderObj);
    res.status(201).json(orderObj);

    // Generate PDF in background
    generateOrderPDF(orderObj, req.user.username, orderObj.attractions, transportation, paymentMethod, totalPrice)
      .catch(err => console.error("❌ PDF gen failed:", err));

  } catch (err) {
    console.error("Order creation failed:", err);
    return res.status(500).json({ message: "Order creation failed", error: err.message });
  }
}

// PDF generation helper
async function generateOrderPDF(order, username, attractionIds, transportation, paymentMethod, totalPrice) {
  const orderId = order._id.toString();
  const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
  const doc = new pdfkit({ size: "A4", margins: { top: 50, bottom: 50, left: 50, right: 50 } });
  const stream = fs.createWriteStream(pdfPath);
  doc.pipe(stream);

  // Fetch attractions names safely
  let names = [];
  if (attractionIds.length) {
    names = await Promise.all(
      attractionIds.map(async id => {
        try { const a = await Attraction.findById(id); return a?.name || "Unknown"; }
        catch { return "Unknown"; }
      })
    );
  }

  // Header
  doc.font("Helvetica-Bold").fontSize(24).fillColor("#1F618D").text("PathMakers - Travel Receipt", { align: "center" });
  doc.moveDown().fontSize(14).fillColor("black").text(`Order ID: ${orderId}`, { align: "center" }).moveDown(1.5);
  
  // Customer
  doc.font("Helvetica-Bold").fontSize(16).text("Customer Details", { underline: true });
  doc.font("Helvetica").fontSize(12).text(`Username: ${username}`).moveDown();

  // Flight
  doc.font("Helvetica-Bold").fontSize(16).text("Flight Details", { underline: true });
  doc.font("Helvetica").fontSize(12)
    .text(`From: ${order.departure_city_name || 'N/A'}`)
    .text(`To: ${order.destination_city_name || 'N/A'}`)
    .text(`Flight: ${order.flight_name || 'N/A'}`).moveDown();

  // Hotel
  doc.font("Helvetica-Bold").fontSize(16).text("Hotel Details", { underline: true });
  doc.font("Helvetica").fontSize(12).text(`Hotel: ${order.hotel_name || 'N/A'}`).moveDown();

  // Attractions
  doc.font("Helvetica-Bold").fontSize(16).text("Attractions", { underline: true });
  doc.font("Helvetica").fontSize(12)
    .text(`Selected Attractions: ${names.length ? names.join(', ') : 'None'}`).moveDown();

  // Transportation + Payment
  doc.font("Helvetica-Bold").fontSize(16).text("Transportation", { underline: true });
  doc.font("Helvetica").fontSize(12).text(`Mode: ${transportation || 'N/A'}`).moveDown();
  doc.font("Helvetica-Bold").fontSize(16).text("Payment Details", { underline: true });
  doc.font("Helvetica").fontSize(12).text(`Method: ${paymentMethod}`);
  doc.fontSize(14).fillColor("#E74C3C").text(`Total Price: $${totalPrice}`, { align: "right" });

  doc.fillColor("black").moveDown(2)
    .font("Helvetica-Oblique").fontSize(10).fillColor("#555")
    .text("Thank you for booking with PathMakers!", { align: "center" });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
}

// GET PDF endpoint
export async function getOrderPDF(req, res) {
  try {
    const orderId = req.params.orderId;
    const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: "PDF not found" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="order-${orderId}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    console.error("getOrderPDF error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}