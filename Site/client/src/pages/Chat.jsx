import React, { useState, useEffect } from "react";
import { ChevronRight, MapPin, Plane, Hotel, Compass, Car, CreditCard, CheckCircle } from "lucide-react";
import "../assets/styles/chat.css";



const TravelPlannerApp = () => {
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
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem("currentStep");
    return savedStep ? parseInt(savedStep, 10) : 0;
  });
  
  useEffect(() => {
    localStorage.setItem("currentStep", currentStep);
  }, [currentStep]);
  
  
  // Save currentStep to localStorage when it changes
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
      try {
        const response = await fetch(`http://localhost:4000/api/flights/${encodeURIComponent(city)}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch flights, status: ${response.status}`);
        }
        const data = await response.json();
        setLoadedFlights(data);
      } catch (error) {
        console.error("Error fetching flights:", error);
      }
    }
    const handleNextStep = () => {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      localStorage.setItem("currentStep", nextStep);
    };
    

    async function fetchHotels(city) {
      if (!city) return;
      try {
        const response = await fetch(`http://localhost:4000/api/hotels/${encodeURIComponent(city)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch attractions for ${city}, status: ${response.status}`);
        }
        const data = await response.json();
        setLoadedHotels(data.hotels || []);
      } catch (error) {
        console.error("Error fetching hotels:", error);
      }
    }

 async function fetchAttractions(city) {
  if (!city) return;
  try {
    const response = await fetch(
      `http://localhost:4000/api/attractions/city/${encodeURIComponent(city)}`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch attractions for ${city}, status: ${response.status}`
      );
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
        userResponses["What is your destination city?"] && fetchHotels(userResponses["What is your destination city?"]),
        userResponses["What is your destination city?"] && fetchAttractions(userResponses["What is your destination city?"]),
      ]);
    }

    fetchData();
  }, [userResponses["What is your destination city?"]]);

  const calculateTotalPrice = () => {
    let total = 0;

    // חישוב מחיר טיסה
    const selectedFlight = userResponses["Select your flight"];
    if (selectedFlight) {
      const flightPrice = parseInt(selectedFlight.split("$")[1]?.split(" ")[0]);
      total += flightPrice || 0;
    }

    // חישוב מחיר מלון
    const selectedHotel = userResponses["Select your hotel"];
    if (selectedHotel) {
      const hotelPrice = parseInt(selectedHotel.split("$")[1]?.split("/")[0]);
      total += hotelPrice || 0;
    }

    // חישוב עלות אטרקציות
    const selectedAttractions = userResponses["Select attractions to visit"];
    if (selectedAttractions) {
      const attractionPrice = 20 * selectedAttractions.split(",").length; // דוגמה למחיר אטרקציות
      total += attractionPrice || 0;
    }

    // חישוב תחבורה
    const selectedTransportation = userResponses["Select your mode of transportation"];
    if (selectedTransportation) {
      const transportationPrice = selectedTransportation === "Car" ? 50 : 10; // דוגמה למחיר תחבורה
      total += transportationPrice || 0;
    }

    return total;
  };

  const steps = [
    {
      label: "Destination",
      icon: MapPin,
      questions: [
        {
  prompt: "What is your departure city?",
  options: loadedCities.length ? loadedCities.map(c => c.city) : ["Loading..."]
},
{
  prompt: "What is your destination city?",
  options: loadedCities.length ? loadedCities.map(c => c.city) : ["Loading..."]
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
          options:
            loadedFlights.length
              ? loadedFlights
                  .find((flight) => flight.city === userResponses["What is your destination city?"])
                  ?.airlines.map((airline) => `${airline.name} - $${airline.price} (${airline.duration})`) || []
              : ["Loading..."],
        },
        { prompt: "Class preference", options: ["Economy", "Business", "First"] },
      ],
    },
    {
      label: "Hotel",
      icon: Hotel,
      questions: [
        {
          prompt: "Select your hotel",
          options:
            loadedHotels.length
              ? loadedHotels.map((hotel) => `${hotel.name} - $${hotel.price}/night`)
              : ["No hotels available"],
        },
        { prompt: "Budget range per night?", type: "text" },
        { prompt: "Accessibility requirements?", options: ["None", "Wheelchair Access", "Ground Floor", "Special Assistance"] },
        { prompt: "Pet-friendly options?", options: ["Yes", "No"] },
      ],
    },
    {
      label: "Attractions",
      icon: Compass,
      questions: [
        {
          prompt: "Select attractions to visit",
          options: loadedAttractions.length ? loadedAttractions : ["No attractions available"],
        },
        { prompt: "Budget for daily activities?", type: "text" },
        { prompt: "Interest areas?", options: ["History", "Food", "Nightlife", "Nature", "Culture"] },
        { prompt: "Group type?", options: ["Solo", "Couple", "Family", "Friends"] },
        { prompt: "Tour preference?", options: ["Guided Tours", "Self-Guided"] },
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
        {
          prompt: "Do you have a promo code?",
          type: "text",
        },
      ],
    }
    ,
    {
      label: "Transportation",
      icon: Car,
      questions: [
        { prompt: "Select your mode of transportation", options: ["Car", "Public Transport", "Bike", "Walk"] },
        { prompt: "Do you need an airport transfer?", options: ["Yes", "No"] },
      ],
    },
    {
      label: "Trip Summary",
      icon: CheckCircle,
      questions: [
        { prompt: "Departure city", value: userResponses["What is your departure city?"] },
        { prompt: "Destination city", value: userResponses["What is your destination city?"] },
        { prompt: "Flight", value: userResponses["Select your flight"] },
        { prompt: "Hotel", value: userResponses["Select your hotel"] },
        { prompt: "Attractions", value: userResponses["Select attractions to visit"] },
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

  // Define PaymentModal first// Define PaymentModal first
  const PaymentModal = ({ isOpen, onClose, totalAmount, onPaymentSuccess, userResponses }) => {
    const [fullName, setFullName] = useState("");
    const [paymentDetails, setPaymentDetails] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [cvv, setCvv] = useState("");
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [error, setError] = useState("");
  
    // Get the current year for expiry date validation
    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 10; // Expiry date limit (10 years in the future)
  
    const handlePayment = () => {
      let errors = [];
  
      // Validate Full Name (Required for all payments)
      if (!fullName.trim() || fullName.trim().length < 3) {
        errors.push("❌ Invalid Full Name. Enter at least 3 characters.");
      }
  
      // Validate Payment Details (16-digit for Credit Card, or a required field for others)
      if (!/^\d{16}$/.test(paymentDetails)) {
        errors.push("❌ Invalid Payment Number. Must be 16 digits.");
      }
  
      // Validate Expiry Date (Only future dates, in MM/YYYY format)
      const expiryMatch = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
      if (!expiryMatch || parseInt(expiryMatch[2]) < currentYear || parseInt(expiryMatch[2]) > maxYear) {
        errors.push(`❌ Invalid Expiry Date. Must be MM/YYYY between ${currentYear}-${maxYear}.`);
      }
  
      // Validate CVV (3 digits)
      if (!/^\d{3}$/.test(cvv)) {
        errors.push("❌ Invalid CVV. Must be exactly 3 digits.");
      }
  
      // If there are errors, display them and prevent submission
      if (errors.length > 0) {
        setError(errors.join("\n"));
        return;
      }
  
      // ✅ If no errors, process payment
      setPaymentSuccess(true);
      setError("");
  
      setTimeout(() => {
        setPaymentSuccess(false);
        setIsPaymentModalOpen(false);
        setPaymentCompleted(true); // ✅ Enables "Next" button
        onPaymentSuccess(); // ✅ Move to the next step
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
            </>
          ) : (
            <>
              <h2>{userResponses["Select payment method"]} Payment</h2>
              {error && <p className="error-message">{error}</p>}
  
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
  
              {/* Payment Number (Same format for all methods) */}
              <label>Payment Number</label>
              <input 
                type="text" 
                placeholder="1234 5678 9012 3456"
                maxLength="16"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value.replace(/\D/g, ""))} // Only allow numbers
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
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} // Only allow numbers
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
  useEffect(() => {
    const step = localStorage.getItem("currentStep");
    // Perform actions based on the current step or load related data
  }, []);
  
  
  
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
    
        try {
            // ✅ Fetch user details first to get userId
            const userResponse = await fetch("http://localhost:4000/api/info/user", {
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
    
            // ✅ Ensure `userResponses` exist before accessing them
            if (!userResponses) {
                console.error("❌ No user responses found!");
                alert("⚠️ No order details available.");
                return;
            }
    
            // ✅ Save order as text for display in Personal Area
            const orderText = `
            Departure: ${userResponses["What is your departure city?"] || "Unknown"}
            Destination: ${userResponses["What is your destination city?"] || "Unknown"}
            Flight: ${userResponses["Select your flight"] || "None"}
            Hotel: ${userResponses["Select your hotel"] || "None"}
            Attractions: ${userResponses["Select attractions to visit"] || "None"}
            Transportation: ${userResponses["Select your mode of transportation"] || "None"}
            Payment Method: ${userResponses["Select payment method"] || "None"}
            Total Price: $${calculateTotalPrice()}
            `;
    
            const orderData = {
                userId: userData.id, // ✅ Attach the logged-in user's ID
                username: userData.username,
                departureCity: userResponses["What is your departure city?"] || "Unknown",
                destinationCity: userResponses["What is your destination city?"] || "Unknown",
                flight: userResponses["Select your flight"] || "None",
                hotel: userResponses["Select your hotel"] || "None",
                attractions: userResponses["Select attractions to visit"]
                    ? userResponses["Select attractions to visit"].split(", ")
                    : [],
                transportation: userResponses["Select your mode of transportation"] || "None",
                paymentMethod: userResponses["Select payment method"] || "None",
                totalPrice: calculateTotalPrice(),
                orderText: orderText.trim() // ✅ Save formatted text
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
                const errorMessage = await response.text();
                console.error("❌ Failed to save order:", response.status, errorMessage);
                alert(`Error: ${errorMessage}`);
                return;
            }
    
            console.log("✅ Order saved successfully!");
    
            // ✅ Store in `localStorage` to persist across sessions
            localStorage.setItem("orderSaved", "true");
    
        } catch (error) {
            console.error("⚠️ Error saving order:", error);
        }
    };
    
    
    const handleDownloadSummary = async () => {
      try {
          const token = localStorage.getItem("authToken"); // ✅ Ensure correct token key
  
          if (!token) {
              console.error("❌ No token found. User might not be logged in.");
              alert("⚠️ You must be logged in to save an order.");
              return;
          }
  
          // ✅ Step 1: Fetch user details
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
  
          // ✅ Step 2: Prepare order data
          const orderData = {
              userId: userData.id, // ✅ Attach the logged-in user's ID
              username: userData.username,
              departureCity: userResponses["What is your departure city?"],
              destinationCity: userResponses["What is your destination city?"],
              flight: userResponses["Select your flight"],
              hotel: userResponses["Select your hotel"],
              attractions: userResponses["Select attractions to visit"]?.split(", "),
              transportation: userResponses["Select your mode of transportation"],
              paymentMethod: userResponses["Select payment method"],
              totalPrice: calculateTotalPrice(),
          };
  
          console.log("🔍 Sending Order Data:", orderData);
  
          // ✅ Step 3: Save the order and get the order ID
          const response = await fetch("http://localhost:4000/api/order", {
              method: "POST",
              headers: {
                  "Authorization": `Bearer ${token}`, // ✅ Include the token
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
  
          // ✅ Step 4: Wait 1 second before fetching the PDF to allow backend processing
          await new Promise(resolve => setTimeout(resolve, 1000));
  
          // ✅ Step 5: Fetch the PDF using the correct Authorization header
          const pdfResponse = await fetch(`http://localhost:4000/api/order/${savedOrder.id}/pdf`, {
              method: "GET",
              headers: {
                  "Authorization": `Bearer ${token}` // ✅ Ensure token is included
              }
          });
  
          if (!pdfResponse.ok) {
              console.error("❌ Failed to fetch PDF:", pdfResponse.status);
              alert("❌ Failed to generate PDF receipt. Try again.");
              return;
          }
  
          // ✅ Step 6: Convert response to a blob and open the PDF
          const pdfBlob = await pdfResponse.blob();
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, "_blank"); // ✅ Open in a new tab
  
      } catch (error) {
          console.error("⚠️ Error saving order or fetching PDF:", error);
          alert("⚠️ An error occurred. Please try again.");
      }
  };
  
      
      const handleRestartTrip = () => {
        setUserResponses({});
        setCurrentStep(0);
        localStorage.removeItem("userResponses");
        localStorage.setItem("currentStep", "0");
      };
    
      return (
        <div className="trip-summary-container">
          <div className="summary-box">
            <h2>Trip Summary</h2>
            <div className="summary-details">
              <p><strong>Departure City:</strong> {userResponses["What is your departure city?"] || "N/A"}</p>
              <p><strong>Destination City:</strong> {userResponses["What is your destination city?"] || "N/A"}</p>
              <p><strong>Flight:</strong> {userResponses["Select your flight"] || "N/A"}</p>
              <p><strong>Hotel:</strong> {userResponses["Select your hotel"] || "N/A"}</p>
              <p><strong>Attractions:</strong> {userResponses["Select attractions to visit"] || "N/A"}</p>
              <p><strong>Transportation:</strong> {userResponses["Select your mode of transportation"] || "N/A"}</p>
              <p><strong>Payment Method:</strong> {userResponses["Select payment method"] || "N/A"}</p>
              <h3>Total Price: ${totalPrice}</h3>
            </div>
    
            <div className="summary-buttons">
              <button className="download-btn" onClick={handleDownloadSummary}>Download receipt</button>
              <button
  className="personal-area-btn"
  onClick={async () => {
    await handleSaveOrder(); // ✅ Save the order only once per session
    window.location.href = "/personal-area"; // ✅ Redirect after saving
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
              {q.type === "text" || q.type === "date" ? (
                <>
                  {/* Handle Departure Date */}
                  {q.prompt.includes("departure") && (
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]} // Disable past dates
                      value={userResponses[q.prompt] || ""}
                      onChange={(e) => {
                        setUserResponses({
                          ...userResponses,
                          [q.prompt]: e.target.value,
                        });
                      }}
                    />
                  )}
  
                  {/* Handle Return Date */}
                  {q.prompt.includes("return") && (
                <input
                type="date"
                min={userResponses["Travel dates (departure)?"] || new Date().toISOString().split("T")[0]}
                value={userResponses[q.prompt] || ""}
                onChange={(e) => setUserResponses({ ...userResponses, [q.prompt]: e.target.value })}
                disabled={!userResponses["Travel dates (departure)?"]}
              />
              
                  )}
  
                  {/* Handle Other Inputs */}
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
                value={userResponses[q.prompt] || ""}
                onChange={(e) => {
                  const selectedValue = e.target.value;
              
                  // ✅ Update user response
                  setUserResponses((prevResponses) => ({
                    ...prevResponses,
                    [q.prompt]: selectedValue,
                  }));
              
                  // ✅ Define payment methods that require confirmation
                  const methodsRequiringModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"];
              
                  // ✅ Force modal to open when a payment method is selected
                  if (q.prompt === "Select payment method") {
                    if (methodsRequiringModal.includes(selectedValue)) {
                      console.log(`Reopening payment modal for ${selectedValue}...`);
                      setIsPaymentModalOpen(false); // Close first
                      setTimeout(() => setIsPaymentModalOpen(true), 10); // Reopen after a slight delay
                      setPaymentCompleted(false); // ✅ Reset payment status until payment is successful
                    } else {
                      setPaymentCompleted(true); // ✅ Other methods allow instant progress
                    }
                  }
                }}
              >
                <option value="" disabled>Select an option</option>
                {q.options &&
                  q.options.length > 0 &&
                  q.options.map((option, i) => (
                    <option key={i} value={option}>
                      {option}
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
  onClick={() => setCurrentStep((prev) => prev + 1)}
  disabled={
    currentStep === steps.length - 1 ||
    (steps[currentStep]?.questions?.length > 0 &&
      !userResponses[steps[currentStep].questions[0]?.prompt]) ||
    (step.label === "Flight" &&
      (!userResponses["Travel dates (departure)?"] ||
        !userResponses["Travel dates (return)?"])) ||
    (step.label === "Payment" &&
      ["Credit Card", "PayPal", "Bank Transfer", "Crypto"].includes(userResponses["Select payment method"]) &&
      !paymentCompleted) // ✅ Prevents skipping any required payment confirmation
  }
  className="custom-btn2"
>
  Next <ChevronRight />
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
  onPaymentSuccess={() => {
    console.log("Payment successful, proceeding...");
    setPaymentCompleted(true);
    setCurrentStep((prev) => prev + 1); // ✅ Move to the next step
  }}
  totalAmount={calculateTotalPrice()} 
  userResponses={userResponses}
/>



{/* <div className="action-buttons">
  <button
    onClick={() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        alert("Thank you for booking!");
        handleSaveOrder({
          id: new Date().getTime(),
          details: JSON.stringify(userResponses),
          status: "Confirmed",
        });
      }
    }}
  >
    {currentStep === steps.length - 1 ? "Confirm & Book" : "Next Step"}
  </button>
</div> */}

    </div>

  );
};

export default TravelPlannerApp;