import React, { useState, useEffect } from "react";
import { ChevronRight, MapPin, Plane, Hotel, Compass, Car, CreditCard, CheckCircle } from "lucide-react";
import "../assets/styles/chat.css";
import { useLocation, useNavigate } from "react-router-dom";

function cleanId(id) {
  if (!id) return null;
  return id.split(/[-_]/)[0];
}
const TravelPlannerApp = () => {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("authToken");

        if (!token) {
            // Reset progress only if it's a new login session
            setCurrentStep(0);
            setUserResponses({});
            localStorage.removeItem("currentStep");
            localStorage.removeItem("userResponses");
            sessionStorage.removeItem("orderSaved");
            // Mark session as logged in
            sessionStorage.setItem("hasLoggedIn", "true");
        }
    }, []); 

    useEffect(() => {
        if (location.state?.onlyPayment) {
            const paymentStepIndex = steps.findIndex(s => s.label === "Payment");
            setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
            setPaymentCompleted(false);
            setIsPaymentModalOpen(true);
        }
}, [location.state]);

    const [currentStep, setCurrentStep] = useState(() => {
        const savedStep = localStorage.getItem("currentStep");
        return savedStep ? parseInt(savedStep, 10) : 0;
    });

    useEffect(() => {
        localStorage.setItem("currentStep", currentStep);
    }, [currentStep]);

    const [userResponses, setUserResponses] = useState(() => {
        const savedResponses = localStorage.getItem("userResponses");
        return savedResponses ? JSON.parse(savedResponses) : {};
    });

    // Save responses to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("userResponses", JSON.stringify(userResponses));
    }, [userResponses]);

    const [loadedCities, setLoadedCities] = useState([]);
    const [loadedFlights, setLoadedFlights] = useState([]);
    const [loadedHotels, setLoadedHotels] = useState([]);
    const [loadedAttractions, setLoadedAttractions] = useState([]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentCompleted, setPaymentCompleted] = useState(false);

    useEffect(() => {
        async function fetchCities() {
            try {
                const response = await fetch("http://localhost:4000/api/cities");
                if (!response.ok) {
                    throw new Error(`Failed to fetch cities, status: ${response.status}`);
                }
                const data = await response.json();
                setLoadedCities(data);
            } catch (error) {
                console.error("Error fetching cities:", error);
            }
        }

    async function fetchFlights(city) {
  if (!city) return;
  const cityName = city.name || city; // if city is object, use its name
  try {
    const response = await fetch(`http://localhost:4000/api/flights/city/${encodeURIComponent(cityName)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch flights for ${cityName}, status: ${response.status}`);
    }
    const data = await response.json();
    setLoadedFlights(data);
  } catch (error) {
    console.error("Error fetching flights:", error);
  }
}
       async function fetchHotels(city) {
  if (!city) return;
  const cityName = city.name || city; // ✔ extract .name if city is an object
  try {
    const response = await fetch(`http://localhost:4000/api/hotels/city/${encodeURIComponent(cityName)}`);
    if (response.status === 404) {
      setLoadedHotels([]);
      return;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch hotels for ${cityName}, status: ${response.status}`);
    }
    const data = await response.json();
    setLoadedHotels(data);
  } catch (error) {
    console.error("Error fetching hotels:", error);
  }
}


       async function fetchAttractions(city) {
  if (!city) return;
  const cityName = city.name || city; // ✔ extract .name if city is an object
  try {
    const response = await fetch(`http://localhost:4000/api/attractions/city/${encodeURIComponent(cityName)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch attractions for ${cityName}, status: ${response.status}`);
    }
    const data = await response.json();
    setLoadedAttractions(data.attractions || []);
  } catch (error) {
    console.error("Error fetching attractions:", error);
  }
}


        async function fetchData() {
          await Promise.all([
  fetchCities(),
  userResponses["What is your destination city?"] &&
    fetchFlights(userResponses["What is your destination city?"]),
  userResponses["What is your destination city?"] &&
    fetchHotels(userResponses["What is your destination city?"]),
  userResponses["What is your destination city?"] &&
    fetchAttractions(userResponses["What is your destination city?"]),
]);

        }
        fetchData();
    }, [userResponses["What is your destination city?"]]);

        const calculateTotalPrice = () => {
          let total = 0;

          // ✈️ מחיר טיסה
          const selectedFlight = userResponses["Select your flight"];
          if (selectedFlight?.price) {
            total += selectedFlight.price;
          }

          // 🏨 מחיר מלון
          const selectedHotel = userResponses["Select your hotel"];
          if (selectedHotel?.price) {
            total += selectedHotel.price;
          }

          // 🏛️ מחיר אטרקציות
          const selectedAttractions = userResponses["Select attractions to visit"];
          if (Array.isArray(selectedAttractions)) {
            selectedAttractions.forEach(attr => {
              if (attr?.price) total += attr.price;
            });
          }

          // 🚗 תחבורה
          const selectedTransportation = userResponses["Select your mode of transportation"];
          if (selectedTransportation) {
            total += selectedTransportation === "Car" ? 50 : 10;
          }
           const numberOfTravelers = parseInt(userResponses["Number of travelers"]) || 1;

          return total * numberOfTravelers;
        };

    // Flatten the attractions for the select dropdown
    const attractionNames =
        loadedAttractions.length && Array.isArray(loadedAttractions[0]?.attractions)
            ? loadedAttractions[0].attractions.map(attr => attr.name)
            : [];
const hotelOptions = loadedHotels.length
  ? loadedHotels.map(hotel => ({
      id: hotel._id,
      name: `${hotel.name} - $${hotel.price}/night`
    }))
  : [];


    // ✅ REORDERED STEPS - Payment comes before Trip Summary
   const steps = [
  {
    label: "Destination",
    icon: MapPin,
    questions: [
      {
        prompt: "What is your departure city?",
        options: loadedCities.length
          ? loadedCities.map(c => ({ id: c._id, name: c.city }))
          : [],
      },
      {
        prompt: "What is your destination city?",
        options: loadedCities.length
          ? loadedCities.map(c => ({ id: c._id, name: c.city }))
          : [],
      },
    ],
  },
 {
  label: "Flight",
  icon: Plane,
  questions: [
    { prompt: "Travel dates (departure)?", type: "date" },
    { prompt: "Travel dates (return)?", type: "date" },
   {
  prompt: "Select your flight",
  options: (() => {
    const dest = userResponses["What is your destination city?"];
    const cityName = typeof dest === "string" ? dest : dest?.name;
    // במקום למצוא קבוצת טיסות, פשוט סינן את כל הטיסות שמתאימות לעיר:
    return loadedFlights
      .filter(flight => flight.city === cityName)
      .map((flight, index) => ({
      id: flight._id, // ensure your backend API returns _id
        name: `${flight.airline} - $${flight.price}`, 
        ...flight,
      }));
  })(),
},
    { prompt: "Class preference", options: ["Economy", "Business", "First"] },
  ],
},
 {
  prompt: "Select your hotel",
  options: (() => {
    const dest = userResponses["What is your destination city?"];
    const cityName = typeof dest === "string" ? dest : dest?.name;
    const hotelGroup = loadedHotels.find(
      h => h.city.toLowerCase() === cityName?.toLowerCase()
    );
    return hotelGroup?.hotels?.map((hotel, i) => ({
      id: hotel._id || `${hotel.name}-${i}`, // Ensure we have an ID
      name: `${hotel.name} - ${hotel.price}/night`,
      price: hotel.price, // Include price for calculations
      ...hotel, // Include all hotel properties
    })) || [];
  })(),
},
 {
  label: "Attractions",
  icon: Compass,
  questions: [
    {
      prompt: "Select attractions to visit",
      options: (() => {
        const dest = userResponses["What is your destination city?"];
        const cityName = typeof dest === "string" ? dest : dest?.name;
        const attractionGroup = loadedAttractions.find(a => a.city === cityName);
        return attractionGroup?.attractions?.map((attr, i) => ({
          id: `${attractionGroup._id}-${i}`,
          name: `${attr.name} - $${attr.price}`,
          ...attr,
        })) || [];
      })(),
    },
    { prompt: "Budget for daily activities?", type: "text" },
    { prompt: "Interest areas?", options: ["History", "Food", "Nightlife", "Nature", "Culture"] },
    { prompt: "Group type?", options: ["Solo", "Couple", "Family", "Friends"] },
   { 
  prompt: "Number of travelers", 
  type: "number", 
  min: 1,
  max: 20
},
    { prompt: "Tour preference?", options: ["Guided Tours", "Self-Guided"] },
  ],
},

  {
    label: "Transportation",
    icon: Car,
    questions: [
      {
        prompt: "Select your mode of transportation",
        options: ["Car", "Public Transport", "Bike", "Walk"],
      },
      { prompt: "Do you need an airport transfer?", options: ["Yes", "No"] },
    ],
  },
  {
    label: "Payment",
    icon: CreditCard,
    questions: [
      {
        prompt: "Select payment method",
        options: ["Credit Card", "PayPal", "Bank Transfer", "Crypto"],
      },
      { prompt: "Do you have a promo code?", type: "text" },
    ],
  },
  {
    label: "Trip Summary",
    icon: CheckCircle,
    questions: [
      { prompt: "Departure city", value: userResponses["What is your departure city?"]?.name },
      { prompt: "Destination city", value: userResponses["What is your destination city?"]?.name },
      { prompt: "Flight", value: userResponses["Select your flight"]?.name },
      { prompt: "Hotel", value: userResponses["Select your hotel"]?.name },
     {
  prompt: "Attractions",
  value: Array.isArray(userResponses["Select attractions to visit"])
    ? userResponses["Select attractions to visit"].map(attr => attr.name).join(", ")
    : userResponses["Select attractions to visit"]?.name || "N/A",
},

      { prompt: "Transportation", value: userResponses["Select your mode of transportation"] },
      { prompt: "Payment method", value: userResponses["Select payment method"] },
      { prompt: "Total Price", value: `$${calculateTotalPrice()}` },
    ],
  },
];


    const renderProgressBar = () => (
        <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
        </div>
    );

    // PaymentModal component
    const PaymentModal = ({ isOpen, onClose, totalAmount, onPaymentSuccess, userResponses }) => {
        const [fullName, setFullName] = useState("");
        const [paymentDetails, setPaymentDetails] = useState("");
        const [expiryDate, setExpiryDate] = useState("");
        const [cvv, setCvv] = useState("");
        const [paymentSuccess, setPaymentSuccess] = useState(false);
        const [error, setError] = useState("");

        const currentYear = new Date().getFullYear();
        const maxYear = currentYear + 10;

        const handlePayment = () => {
            let errors = [];

            if (!fullName.trim() || fullName.trim().length < 3) {
                errors.push("❌ Invalid Full Name. Enter at least 3 characters.");
            }

            if (!/^\d{16}$/.test(paymentDetails)) {
                errors.push("❌ Invalid Payment Number. Must be 16 digits.");
            }

            const expiryMatch = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
            if (!expiryMatch || parseInt(expiryMatch[2]) < currentYear || parseInt(expiryMatch[2]) > maxYear) {
                errors.push(`❌ Invalid Expiry Date. Must be MM/YYYY between ${currentYear}-${maxYear}.`);
            }

            if (!/^\d{3}$/.test(cvv)) {
                errors.push("❌ Invalid CVV. Must be exactly 3 digits.");
            }

            if (errors.length > 0) {
                setError(errors.join("\n"));
                return;
            }

            setPaymentSuccess(true);
            setError("");

            setTimeout(() => {
                setPaymentSuccess(false);
                setIsPaymentModalOpen(false);
                setPaymentCompleted(true);
                onPaymentSuccess();
            }, 2000);
        };

        if (!isOpen) return null;

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    {paymentSuccess ? (
                        <>
                            <h2>🎉 Payment Successful! 🎉</h2>
                            <p>Your payment of <strong>${totalAmount}</strong> has been processed.</p>
                            <p>✅ Your trip is now confirmed!</p>
                        </>
                    ) : (
                        <>
                            <h2>{userResponses["Select payment method"]} Payment</h2>
                            <p><strong>Total Amount: ${totalAmount}</strong></p>
                            {error && <p className="error-message">{error}</p>}

                            <label>Full Name</label>
                            <input 
                                type="text" 
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />

                            <label>Payment Number</label>
                            <input 
                                type="text" 
                                placeholder="1234 5678 9012 3456"
                                maxLength="16"
                                value={paymentDetails}
                                onChange={(e) => setPaymentDetails(e.target.value.replace(/\D/g, ""))}
                            />

                            <div className="expiry-cvv">
                                <div>
                                    <label>Expiry Date</label>
                                    <input 
                                        type="text" 
                                        placeholder="MM/YYYY" 
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label>CVV</label>
                                    <input 
                                        type="text" 
                                        placeholder="123"
                                        maxLength="3"
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                                    />
                                </div>
                            </div>

                            <button className="pay-button" onClick={handlePayment} disabled={paymentSuccess}>
                                {paymentSuccess ? "Processing..." : `Pay $${totalAmount}`}
                            </button>
                            <button className="change-payment" onClick={onClose}>Change payment method</button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderStepContent = () => {
        const step = steps[currentStep];

        if (step.label === "Trip Summary") {
          
            const totalPrice = calculateTotalPrice();

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

  let selectedAttractions = userResponses["Select attractions to visit"];
  if (!Array.isArray(selectedAttractions)) {
    selectedAttractions = selectedAttractions ? [selectedAttractions] : [];
  }
console.log("userResponses before order:", userResponses);

const orderData = {
  departureCityId: cleanId(userResponses["What is your departure city?"]?.id),
  destinationCityId: cleanId(userResponses["What is your destination city?"]?.id),
  flightId: cleanId(userResponses["Select your flight"]?.id),
  hotelId: cleanId(userResponses["Select your hotel"]?.id),
  attractions: (Array.isArray(userResponses["Select attractions to visit"])
    ? userResponses["Select attractions to visit"].map(a => cleanId(a.id))
    : []),
  transportation: userResponses["Select your mode of transportation"] || null,
  paymentMethod: userResponses["Select payment method"] || "Unknown",
  totalPrice: calculateTotalPrice(),
};

console.log("Sending orderData:", orderData);

console.log("🧪 Checking IDs before sending:");
console.log("departureCityId:", orderData.departureCityId);
console.log("destinationCityId:", orderData.destinationCityId);
console.log("flightId:", orderData.flightId);
console.log("hotelId:", orderData.hotelId);
console.log("attractions:", orderData.attractions);

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
    // Optionally, navigate or show receipt here

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

                   const orderData = {
                      departureCityId: cleanId(userResponses["What is your departure city?"]?.id),
                      destinationCityId: cleanId(userResponses["What is your destination city?"]?.id),
                      flightId: cleanId(userResponses["Select your flight"]?.id),
                      hotelId: cleanId(userResponses["Select your hotel"]?.id),
                      attractions: Array.isArray(userResponses["Select attractions to visit"])
                        ? userResponses["Select attractions to visit"].map(a => cleanId(a.id))
                        : [cleanId(userResponses["Select attractions to visit"]?.id)],
                      transportation: userResponses["Select your mode of transportation"] || null,
                      paymentMethod: userResponses["Select payment method"] || "Unknown",
                      totalPrice: calculateTotalPrice(),
                };


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
                setPaymentCompleted(false); // ✅ Reset payment status
                localStorage.removeItem("userResponses");
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
                        <h3>Total Paid: ${calculateTotalPrice()}</h3>
                      </div>
                        <div className="summary-buttons">
                            <button className="download-btn" onClick={handleDownloadSummary}>Download Receipt</button>
                            <button
                                className="personal-area-btn"
                                onClick={async () => {
                                    await handleSaveOrder();
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
        }

        return (
            <div className="step">
                <div className="step-header">
                    <step.icon />
                    <h2>{step.label}</h2>
                </div>
                <div className="step-content">
                    {step.questions.map((q, index) => (
                        <div key={index}>
                            <label>{q.prompt}</label>
                            {q.type === "text" || q.type === "date" || q.type === "number" ? (
                                <>
                                    {q.prompt.includes("departure") && (
                                        <input
                                            type="date"
                                            min={new Date().toISOString().split("T")[0]}
                                            value={userResponses[q.prompt] || ""}
                                            onChange={(e) => {
                                                setUserResponses({
                                                    ...userResponses,
                                                    [q.prompt]: e.target.value,
                                                });
                                            }}
                                        />
                                    )}

                                    {q.prompt.includes("return") && (
                                        <input
                                            type="date"
                                            min={userResponses["Travel dates (departure)?"] || new Date().toISOString().split("T")[0]}
                                            value={userResponses[q.prompt] || ""}
                                            onChange={(e) => setUserResponses({ ...userResponses, [q.prompt]: e.target.value })}
                                            disabled={!userResponses["Travel dates (departure)?"]}
                                        />
                                    )}

                                    {!q.prompt.includes("departure") && !q.prompt.includes("return") && (
                                        <input
                                            type={q.type}
                                            value={userResponses[q.prompt] || ""}
                                            onChange={(e) =>
                                                setUserResponses({ ...userResponses, [q.prompt]: e.target.value })
                                            }
                                        />
                                    )}
                                </>
                            ) : (
                        
<select
  value={typeof userResponses[q.prompt] === "object" ? userResponses[q.prompt]?.id : userResponses[q.prompt] || ""}
  onChange={(e) => {
    let selectedOption;
    if (typeof q.options[0] === "string") {
      selectedOption = e.target.value;
    } else {
      // IMPORTANT: Store the complete hotel object, not just the ID
      selectedOption = q.options.find(opt => opt.id === e.target.value);
    }
    setUserResponses((prevResponses) => ({
      ...prevResponses,
      [q.prompt]: selectedOption,
    }));
    
    const methodsRequiringModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"];
    if (q.prompt === "Select payment method") {
      if (methodsRequiringModal.includes(selectedOption?.name || selectedOption)) {
        console.log(`Opening payment modal for ${selectedOption?.name || selectedOption}...`);
        setIsPaymentModalOpen(false);
        setTimeout(() => setIsPaymentModalOpen(true), 10);
        setPaymentCompleted(false);
      } else {
        setPaymentCompleted(true);
      }
    }
  }}
>
  <option value="" disabled>Select an option</option>
  {q.options &&
    q.options.length > 0 &&
    q.options.map((option, i) => (
      <option key={i} value={typeof option === "string" ? option : option.id}>
        {typeof option === "string" ? option : option.name}
      </option>
    ))}
</select>
 )}
                        </div>
                    ))}
                </div>
                
                <div className="navigation-buttons">
                    <button
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        disabled={currentStep === 0}
                        className="custom-btn1"
                    >
                        Back
                    </button>
                    <button
                        onClick={() => {
                            const step = steps[currentStep];
                            const isPaymentStep = step.label === "Payment";
                            const selectedMethod = userResponses["Select payment method"];
                            const requiresModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"].includes(selectedMethod);

                            if (isPaymentStep && requiresModal && !paymentCompleted) {
                                setIsPaymentModalOpen(true);
                                return;
                            }
                            setCurrentStep((prev) => prev + 1);
                        }}
                        disabled={
                            currentStep === steps.length - 1 ||
                            (steps[currentStep]?.questions?.length > 0 &&
                                !userResponses[steps[currentStep].questions[0]?.prompt]) ||
                            (steps[currentStep]?.label === "Flight" &&
                                (!userResponses["Travel dates (departure)?"] ||
                                    !userResponses["Travel dates (return)?"])) ||
                            (steps[currentStep]?.label === "Payment" && !paymentCompleted)
                        }
                        className="custom-btn2"
                    >
                        {currentStep === steps.length - 1 ? "Finish" : "Next"} <ChevronRight />
                    </button>
                </div>
            </div>
        );
    };
    return (
        <div className="containerCh">
            <header>
                <h1>Travel Planner</h1>
                {renderProgressBar()}
            </header>
            {renderStepContent()}
            <PaymentModal 
                isOpen={isPaymentModalOpen} 
                onClose={() => {
                    console.log("Closing payment modal...");
                    setIsPaymentModalOpen(false);
                }} 
                onPaymentSuccess={async () => {
                    console.log("Payment successful, proceeding...");
                    setPaymentCompleted(true);
                    setCurrentStep((prev) => prev + 1);
                }}
                totalAmount={calculateTotalPrice()} 
                userResponses={userResponses}
            />
        </div>
    );
};
export default TravelPlannerApp;