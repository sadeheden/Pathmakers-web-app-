import React from "react";
import { useNavigate } from "react-router-dom";
import { calculateTotalPrice, cleanId } from "../utils/travelUtils";

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

        const orderData = {
            departureCityId: extractId(userResponses["What is your departure city?"]),
            destinationCityId: extractId(userResponses["What is your destination city?"]),
            flightId: extractId(userResponses["Select your flight"]),
            hotelId: extractHotelId(userResponses["Select your hotel"]),
            attractions: selectedAttractions.map(a => extractId(a)).filter(Boolean),
            transportation: userResponses["Select your mode of transportation"] || null,
            paymentMethod: userResponses["Select payment method"] || "Unknown",
            totalPrice: calculateTotalPrice(userResponses),
        };

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

        } catch (error) {
            console.error("⚠️ Error saving order:", error);
            alert("⚠️ An error occurred while saving your order. Please try again.");
        }
    };

    const handleDownloadSummary = async () => {
        try {
            const token = localStorage.getItem("authToken");

            if (!token) {
                console.error("❌ No token found. User might not be logged in.");
                alert("⚠️ You must be logged in to download receipt.");
                return;
            }
            const userResponse = await fetch("http://localhost:4000/api/auth/user", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!userResponse.ok) {
                throw new Error("❌ Failed to fetch user details.");
            }

            const userData = await userResponse.json();
            console.log("✅ Fetched User:", userData);

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

            const orderData = {
                departureCityId: extractId(userResponses["What is your departure city?"]),
                destinationCityId: extractId(userResponses["What is your destination city?"]),
                flightId: extractId(userResponses["Select your flight"]),
                hotelId: extractHotelId(userResponses["Select your hotel"]),
                attractions: Array.isArray(userResponses["Select attractions to visit"])
                    ? userResponses["Select attractions to visit"].map(a => extractId(a)).filter(Boolean)
                    : [extractId(userResponses["Select attractions to visit"])].filter(Boolean),
                transportation: userResponses["Select your mode of transportation"] || null,
                paymentMethod: userResponses["Select payment method"] || "Unknown",
                totalPrice: calculateTotalPrice(userResponses),
            };

            // If hotelId is still null, let's try to use the destination city ID as fallback
            if (!orderData.hotelId && orderData.destinationCityId) {
                console.log("⚠️ Hotel ID is null, using destination city ID as fallback");
                orderData.hotelId = orderData.destinationCityId;
            }

            console.log("🔍 Sending Order Data:", orderData);

            const response = await fetch("http://localhost:4000/api/order", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                console.error("❌ Failed to save order:", response.status);
                return;
            }

            const savedOrder = await response.json();
            console.log("✅ Order saved successfully:", savedOrder);

            await new Promise(resolve => setTimeout(resolve, 1000));

           const pdfResponse = await fetch(`http://localhost:4000/api/order/${savedOrder._id}/pdf`, {
     method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!pdfResponse.ok) {
                console.error("❌ Failed to fetch PDF:", pdfResponse.status);
                alert("❌ Failed to generate PDF receipt. Try again.");
                return;
            }

            const pdfBlob = await pdfResponse.blob();
            const pdfUrl = URL.createObjectURL(pdfBlob);
            window.open(pdfUrl, "_blank");

        } catch (error) {
            console.error("⚠️ Error saving order or fetching PDF:", error);
            alert("⚠️ An error occurred. Please try again.");
        }
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
                    <button className="download-btn" onClick={handleDownloadSummary}>Download Receipt</button>
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