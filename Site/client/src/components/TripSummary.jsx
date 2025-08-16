import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { calculateTotalPrice } from "../utils/travelUtils";

const TripSummary = ({ userResponses, setUserResponses, setCurrentStep, setPaymentCompleted }) => {
    const navigate = useNavigate();

    const handleSaveOrder = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("❌ No token found. User might not be logged in.");
            alert("⚠️ You must be logged in to save an order.");
            return;
        }

        if (!userResponses) {
            console.error("❌ No user responses found!");
            alert("⚠️ No order details available.");
            return;
        }

        // Helper function to extract and clean ID
        const extractId = (item) => {
            if (!item) return null;
            
            let id = null;
            if (typeof item === 'string') {
                id = item;
            } else if (typeof item === 'object' && item.id) {
                id = item.id;
            } else if (typeof item === 'object' && item._id) {
                id = item._id;
            }
            
            if (!id) return null;
            
            // Clean compound IDs - extract only the ObjectId part
            if (typeof id === 'string') {
                // For IDs like "68075f88dc218773e0652230_1", extract the first part
                const parts = id.split(/[-_]/);
                const cleanedId = parts[0];
                
                // Validate it's a proper 24-character hex ObjectId
                if (/^[a-f\d]{24}$/i.test(cleanedId)) {
                    return cleanedId;
                }
            }
            
            return null;
        };

        // Special function for hotel ID extraction since hotels are stored differently
        const extractHotelId = (item) => {
            if (!item) return null;
            
            // If it's an object with hotel details, try to find the city ID and hotel index
            if (typeof item === 'object') {
                // Check if we have the raw hotel object with city info
                if (item.id && typeof item.id === 'string') {
                    // For compound hotel IDs like "68075dd4f110a359e23cd001-1"
                    const parts = item.id.split('-');
                    if (parts.length >= 1) {
                        const cityId = parts[0];
                        if (/^[a-f\d]{24}$/i.test(cityId)) {
                            return cityId; // Return the city ID for now
                        }
                    }
                }
                
                // Check for _id property
                if (item._id) {
                    return extractId(item._id);
                }
            }
            
            // Try normal ID extraction as fallback
            return extractId(item);
        };

       let selectedAttractions = userResponses["Select attractions to visit"];
if (!Array.isArray(selectedAttractions)) {
  selectedAttractions = selectedAttractions ? [selectedAttractions] : [];
}
const cleanedAttractions = selectedAttractions.map(a => extractId(a)).filter(Boolean);
// ✅ IMPROVED VERSION:
const getResponseValue = (key) => {
  const response = userResponses[key];
  if (!response) return null;
  
  // If it's an object with name property
  if (typeof response === 'object' && response.name) {
    return response.name;
  }
  
  // If it's a string
  if (typeof response === 'string') {
    return response;
  }
  
  // If it's an object with id property, try to use that
  if (typeof response === 'object' && response.id) {
    return response.id;
  }
  
  return null;
};

const resolveRes = await fetch("http://localhost:4000/api/order/resolve", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    departure: getResponseValue("What is your departure city?"),
    destination: getResponseValue("What is your destination city?"),
    flight: getResponseValue("Select your flight"),
    hotel: getResponseValue("Select your hotel"),
  }),
});
if (!resolveRes.ok) throw new Error("Could not resolve IDs");
const { ids } = await resolveRes.json();

// Now create orderData **once**
const orderData = {
  departureCityId: ids.departureCityId,
  destinationCityId: ids.destinationCityId,
  flightId: ids.flightId,
  hotelId: ids.hotelId || ids.destinationCityId, // fallback if hotel not found
  attractions: cleanedAttractions,
  transportation: userResponses["Select your mode of transportation"] || null,
  paymentMethod: userResponses["Select payment method"] || "Unknown",
  totalPrice: calculateTotalPrice(userResponses),
};

console.log("🔍 Extracted IDs:", orderData);



        console.log("🧪 Checking IDs before sending:");
        console.log("Raw departure city:", userResponses["What is your departure city?"]);
        console.log("Raw destination city:", userResponses["What is your destination city?"]);
        console.log("Raw flight:", userResponses["Select your flight"]);
        console.log("Raw hotel:", userResponses["Select your hotel"]);
        console.log("Raw attractions:", userResponses["Select attractions to visit"]);
        
        console.log("🔍 Extracted IDs:");
        console.log("departureCityId:", orderData.departureCityId);
        console.log("destinationCityId:", orderData.destinationCityId);
        console.log("flightId:", orderData.flightId);
        console.log("hotelId:", orderData.hotelId);
        console.log("attractions:", orderData.attractions);

        // If hotelId is still null, let's try to use the destination city ID as fallback
        if (!orderData.hotelId && orderData.destinationCityId) {
            console.log("⚠️ Hotel ID is null, using destination city ID as fallback");
            orderData.hotelId = orderData.destinationCityId;
        }

        console.log("🔍 Sending Order Data:", orderData);

        try {
            const response = await fetch("http://localhost:4000/api/order", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                console.error("❌ Failed to save order:", response.status, errorMessage);
                alert(`Error: ${errorMessage}`);
                return;
            }
            const savedOrder = await response.json();
            console.log("✅ Order saved successfully!", savedOrder);
            localStorage.setItem("orderSaved", "true");
            // Optional: fetch all orders if not already in context
                const ordersRes = await fetch("http://localhost:4000/api/order", {
                headers: { "Authorization": `Bearer ${token}` },
                });
                const { orders } = await ordersRes.json();

                // Find the full enriched order with all city/flight/hotel names
              const enrichedOrder = orders.find(o => o._id === savedOrder._id);
if (!enrichedOrder) {
  alert("Could not match saved order.");
  return;
}
handleGeneratePDF(savedOrder); // ✅ Generate PDF



        } catch (error) {
            console.error("⚠️ Error saving order:", error);
            alert("⚠️ An error occurred while saving your order. Please try again.");
        }
};

// If you want a logo, import it (as Base64 or file)
// import logo from "../assets/logo.png";


const handleGeneratePDF = (order) => {
  const doc = new jsPDF();
  const lineHeight = 10;
  let y = 20;

  const get = (q) => userResponses[q]?.name || userResponses[q] || "N/A";
  const getList = (q) =>
    Array.isArray(userResponses[q])
      ? userResponses[q].map((a) => a.name || a).join(", ")
      : userResponses[q]?.name || "N/A";

  // ===== Add logo (optional) =====
//    doc.addImage(logo, "PNG", 80, y, 50, 20);
//    y += 25;

  // ===== Header =====
  doc.setFontSize(18);
  doc.setTextColor("#2A3E5B");
  doc.text("PathMakers AI - Travel Receipt", 105, y, { align: "center" });
  y += lineHeight * 2;

  doc.setFontSize(12);
  doc.setTextColor("black");
  doc.text(` Payment Status: Completed`, 20, y);
  y += lineHeight * 2;
doc.text(`Order #: ${order?._id || "Unknown"}`, 20, y); // ✅ Order Number here
  y += lineHeight;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, y);
  y += lineHeight;
  // ===== Table Content =====
  autoTable(doc, {
    startY: y,
      tableWidth: 'wrap',
    head: [["Order", "Details"]],
    body: [
      ["Departure City", get("What is your departure city?")],
      ["Destination City", get("What is your destination city?")],
      ["Flight", get("Select your flight")],
      ["Hotel", get("Select your hotel")],
      ["Attractions", getList("Select attractions to visit")],
      ["Transportation", get("Select your mode of transportation")],
      ["Payment Method", get("Select payment method")],
    ],
    styles: { overflow: 'linebreak',
  cellPadding: 3, fontSize: 11 },
    headStyles: {
      fillColor: [42, 62, 91], // dark blue
      textColor: [255, 255, 255],
      halign: "center",
    },
    columnStyles: {
        0: { cellWidth: 60 }, 
     1: { cellWidth: 120 } 
    },
  });

  // ===== Total Price Highlight =====
  y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setTextColor("#2A3E5B");
  doc.setFont("helvetica", "bold");
  doc.text(
    `Total Paid: $${calculateTotalPrice(userResponses).toFixed(2)}`,
    20,
    y
  );

  // ===== Footer =====
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("gray");
  doc.text(
    "Thank you for booking with PathMakers AI!",
    105,
    285,
    { align: "center" }
  );
  doc.text(
    "Contact us: info@pathmakers.com | +1-800-555-TRVL",
    105,
    292,
    { align: "center" }
  );

  doc.save("trip-receipt.pdf");
};

    const handleRestartTrip = () => {
        setUserResponses({});
        setCurrentStep(0);
        setPaymentCompleted(false);
        localStorage.removeItem("userResponses");
        localStorage.removeItem("orderSaved"); 
        localStorage.setItem("currentStep", "0");
    };

    return (
        <div className="trip-summary-container">
            <div className="summary-box">
                <h2>🎉 Trip Confirmed!</h2>
                <p><strong>✅ Payment Status:</strong> Completed</p>
                <div className="summary-details">
                    <p><strong>Departure City:</strong> {userResponses["What is your departure city?"]?.name || "N/A"}</p>
                    <p><strong>Destination City:</strong> {userResponses["What is your destination city?"]?.name || "N/A"}</p>
                    <p><strong>Flight:</strong> {userResponses["Select your flight"]?.name || "N/A"}</p>
                    <p><strong>Hotel:</strong> {userResponses["Select your hotel"]?.name || "N/A"}</p>
                    <p><strong>Attractions:</strong> {Array.isArray(userResponses["Select attractions to visit"])
                        ? userResponses["Select attractions to visit"].map(attr => attr.name).join(", ")
                        : userResponses["Select attractions to visit"]?.name || "N/A"}</p>
                    <p><strong>Transportation:</strong> {userResponses["Select your mode of transportation"] || "N/A"}</p>
                    <p><strong>Payment Method:</strong> {userResponses["Select payment method"] || "N/A"}</p>
                    <h3>Total Paid: ${calculateTotalPrice(userResponses)}</h3>
                </div>
                <div className="summary-buttons">
                    <button className="download-btn" onClick={handleSaveOrder}>Download Receipt</button>
                    <button
                        className="personal-area-btn"
                       onClick={async () => {
                    const alreadySaved = localStorage.getItem("orderSaved");

                    if (!alreadySaved) {
                        await handleSaveOrder();
                        localStorage.setItem("orderSaved", "true"); // ✅ mark as saved
                    }

                    navigate("/personal-area");
                }}

                    >
                        Go to Personal Area
                    </button>
                    <button className="personal-area-btn" onClick={handleRestartTrip}>
                        Plan Another Trip
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TripSummary;