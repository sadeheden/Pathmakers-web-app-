import Order from './order.model.js';
import { v4 as uuidv4 } from "uuid";
import pdfkit from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";


// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfDir = path.join(__dirname, "../../data/pdfs");

// Ensure PDF directory exists
if (!fs.existsSync(pdfDir)) {
  fs.mkdirSync(pdfDir, { recursive: true });
}

export async function getUserOrders(req, res) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized: User not identified" });
  }
  try {
    const userId = String(req.user.id);
    const orders = await Order.findByUserId(userId);

    const formattedOrders = orders.map(order => ({
      id: order._id,
      departureCity: order.departure_city_id,
      destinationCity: order.destination_city_id,
      totalPrice: order.total_price,
      createdAt: order.created_at
    }));

    res.status(200).json(formattedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}


export async function createOrder(req, res) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized: User not identified" });
  }

  try {
    const {
      departureCityId,
      destinationCityId,
      flightId,
      hotelId,
      attractions,
      transportation,
      paymentMethod,
      totalPrice,
    } = req.body;

    // Basic validation example (מומלץ להרחיב בהתאם לצורך)
    if (
      !departureCityId ||
      !destinationCityId ||
      !flightId ||
      !hotelId ||
      !paymentMethod ||
      !totalPrice
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const userId = String(req.user.id);
    const username = req.user.username;
    const orderId = uuidv4();

    const newOrder = new Order({
  user_id: userId,
  departure_city_id: departureCityId,
  destination_city_id: destinationCityId,
  flight_id: flightId,
  hotel_id: hotelId,
  attractions,
  payment_method: paymentMethod,
  total_price: totalPrice,
  created_at: new Date(),
});

const savedOrder = await newOrder.save();

res.status(201).json(savedOrder);


    // יצירת PDF (כמו בקוד שלך, לא שיניתי)
    const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
    const doc = new pdfkit({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.font("Helvetica-Bold").fontSize(24).fillColor("#1F618D").text("PathMakers - Travel Receipt", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor("black").text(`Order ID: ${orderId}`, { align: "center" });
    doc.moveDown(1.5);
    doc.font("Helvetica-Bold").fontSize(16).text("Customer Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Username: ${username}`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("Flight Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Flight: ${flightId || "N/A"}`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("Hotel Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Hotel: ${hotelId || "N/A"}`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("Attractions", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Selected Attractions: ${attractions?.join(", ") || "None"}`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("Transportation", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Mode: ${transportation || "N/A"}`);
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(16).text("Payment Details", { underline: true });
    doc.font("Helvetica").fontSize(12).text(`Payment Method: ${paymentMethod}`);
    doc.fontSize(14).fillColor("#E74C3C").text(`Total Price: $${totalPrice}`, { align: "right" });
    doc.fillColor("black");
    doc.moveDown(1);
    doc.moveDown(2);
    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#555").text("Thank you for booking with PathMakers!", { align: "center" });
    doc.fillColor("black");

    doc.end();

    stream.on("finish", () => res.status(201).json(newOrder));
    stream.on("error", (error) => {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getOrderPDF(req, res) {
  try {
    const { orderId } = req.params;
    // Fetch order from DB
    const order = await Order.findByOrderId(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    // Check user ownership
    if (!req.user || order.user_id !== String(req.user.id)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ message: "PDF not found. Please try generating a new order." });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=receipt-${orderId}.pdf`);
    res.sendFile(pdfPath);
  } catch (error) {
    console.error("Error serving PDF:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
