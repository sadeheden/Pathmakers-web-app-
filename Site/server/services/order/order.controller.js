import { ObjectId } from "mongodb";
import { insertOrder, findOrdersByUserId } from "./order.model.js";
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

// Get all orders for a user
export const getUserOrders = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized: User not identified" });
        }
        const userId = String(req.user.id);
        const orders = await findOrdersByUserId(userId);
        return res.status(200).json(orders);
    } catch (error) {
        console.error("⚠️ Error fetching orders:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Save a new order and generate PDF
export const createOrder = async (req, res) => {
    try {
        const {
            departureCityId, // should be string representing ObjectId
            destinationCityId,
            flightId,
            hotelId,
            attractions,
            transportation,
            paymentMethod,
            totalPrice,
        } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized: User not identified" });
        }

        const userId = String(req.user.id);
        const username = req.user.username;

        const orderId = uuidv4(); // This is your app's orderId, not Mongo's _id

        // Build the order to insert to MongoDB
        const newOrder = {
            orderId, // App-specific, not Mongo's default _id
            user_id: new ObjectId(userId),
            username,
            departure_city_id: new ObjectId(departureCityId),
            destination_city_id: new ObjectId(destinationCityId),
            flight_id: new ObjectId(flightId),
            hotel_id: new ObjectId(hotelId),
            attractions: attractions || [],
            transportation: transportation || null,
            payment_method: paymentMethod,
            total_price: totalPrice,
            pdfUrl: `/api/order/${orderId}/pdf`,
            created_at: new Date(),
        };

        // Insert to MongoDB
        await insertOrder(newOrder);

        // PDF Generation logic (keep as is)
        const pdfPath = path.join(pdfDir, `${orderId}.pdf`);
        const doc = new pdfkit({
            size: "A4",
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);

        // Header Section
        doc.font("Helvetica-Bold").fontSize(24).fillColor("#1F618D").text("PathMakers - Travel Receipt", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor("black").text(`Order ID: ${orderId}`, { align: "center" });
        doc.moveDown(1.5);

        // Customer Info
        doc.font("Helvetica-Bold").fontSize(16).text("Customer Details", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Username: ${username}`);
        doc.moveDown(1);

        // Flight Details
        doc.font("Helvetica-Bold").fontSize(16).text("Flight Details", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Flight: ${flightId || "N/A"}`);
        doc.moveDown(1);

        // Hotel Details
        doc.font("Helvetica-Bold").fontSize(16).text("Hotel Details", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Hotel: ${hotelId || "N/A"}`);
        doc.moveDown(1);

        // Attractions
        doc.font("Helvetica-Bold").fontSize(16).text("Attractions", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Selected Attractions: ${attractions?.join(", ") || "None"}`);
        doc.moveDown(1);

        // Transportation
        doc.font("Helvetica-Bold").fontSize(16).text("Transportation", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Mode: ${transportation || "N/A"}`);
        doc.moveDown(1);

        // Payment
        doc.font("Helvetica-Bold").fontSize(16).text("Payment Details", { underline: true });
        doc.font("Helvetica").fontSize(12);
        doc.text(`Payment Method: ${paymentMethod}`);
        doc.fontSize(14).fillColor("#E74C3C").text(`Total Price: $${totalPrice}`, { align: "right" });
        doc.fillColor("black");
        doc.moveDown(1);

        // Footer
        doc.moveDown(2);
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#555")
           .text("Thank you for booking with PathMakers!", { align: "center" });
        doc.fillColor("black");

        doc.end();

        stream.on("finish", () => {
            return res.status(201).json(newOrder);
        });

        stream.on("error", (error) => {
            console.error("❌ Error generating PDF:", error);
            return res.status(500).json({ message: "Failed to generate PDF" });
        });

    } catch (error) {
        console.error("⚠️ Error creating order:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Serve the PDF file
export const getOrderPDF = async (req, res) => {
    try {
        const { orderId } = req.params;
        const pdfPath = path.join(pdfDir, `${orderId}.pdf`);

        if (!fs.existsSync(pdfPath)) {
            return res.status(404).json({ message: "PDF not found. Please try generating a new order." });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename=receipt-${orderId}.pdf`);
        res.sendFile(pdfPath);
    } catch (error) {
        console.error("⚠️ Error serving PDF:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};
