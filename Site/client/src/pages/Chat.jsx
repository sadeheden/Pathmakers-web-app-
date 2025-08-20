import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../assets/styles/chat.css";

import { useTravelData } from "../hooks/TravelData.jsx";
import { calculateTotalPrice } from "../utils/travelUtils.jsx";
import { createSteps } from "../config/TravelSteps.jsx";
import PaymentModal from "../components/PaymentModal.jsx";
import TripSummary from "../components/TripSummary.jsx";
import StepContent from "../components/StepContent.jsx";
import Stepper from "../components/Stepper.jsx";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace(/\/$/, "")) ||
  "http://localhost:4000"; // change if you have a Vite proxy

const TravelPlannerApp = () => {
  const location = useLocation();
  const navigate = useNavigate();
// Chat.jsx
const savingOrderRef = useRef(false);

const [toast, setToast] = useState(null); // { type: 'success' | 'error', text: string }

  // progress
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem("currentStep");
    return savedStep ? parseInt(savedStep, 10) : 0;
  });

  // responses
  const [userResponses, setUserResponses] = useState(() => {
    const savedResponses = localStorage.getItem("userResponses");
    return savedResponses ? JSON.parse(savedResponses) : {};
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
 
  // Start Over: clear answers and jump to step 1
const restartTrip = React.useCallback(() => {
  try {
    setIsPaymentModalOpen(false);
    setPaymentCompleted(false);
    setUserResponses({});
    setCurrentStep(0);

    // clear persisted progress
    localStorage.removeItem("currentStep");
    localStorage.removeItem("userResponses");
    sessionStorage.removeItem("orderSaved");
  } finally {
    // bring user back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}, []);


  // base data from hook
  const {
    loadedCities = [],
    loadedFlights = [],
    loadedHotels = [],
    loadedAttractions = [],
  } = useTravelData(userResponses) || {};

  // live hotels from API (by chosen destination)
  const [hotelsFromApi, setHotelsFromApi] = useState([]);

  useEffect(() => {
    // pick any token the app uses (optional header)
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    // destination from responses (id or name/slug)
    const dstId =
      userResponses?.destination_city_id || userResponses?.destinationCityId;
    const dstName =
      userResponses?.destination ||
      userResponses?.destinationCityName ||
      userResponses?.cityName ||
      userResponses?.citySlug;

    if (!dstId && !dstName) {
      setHotelsFromApi([]);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const key = dstId || dstName;
        const url = `${API_BASE}/api/hotels/city/${encodeURIComponent(key)}`;

     const headers = { "Content-Type": "application/json" };
if (token) {
  headers.Authorization = `Bearer ${token}`;
}



        const res = await fetch(url, { headers, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const hotels = Array.isArray(data.hotels)
          ? data.hotels
          : Array.isArray(data?.data?.hotels)
          ? data.data.hotels
          : [];

        // normalize price from Extended JSON if present
        const normPrice = (p) =>
          typeof p === "object" && p
            ? Number(p.$numberInt ?? p.$numberDouble ?? p.value ?? 0)
            : p ?? null;

        const normalized = hotels.map((h, idx) => ({
          id: h._id || h.id || h.optionId || `${h.parentId || "h"}-${idx}`,
          name: h.name || h.hotelName || "Hotel",
          price: normPrice(h.price ?? h.cost),
          rating: h.rating ?? h.stars ?? null,
          image: h.image || (Array.isArray(h.images) ? h.images[0] : null),
        }));

        setHotelsFromApi(normalized);
      } catch (e) {
        console.error("hotels fetch failed", e);
        setHotelsFromApi([]);
      }
    })();

    return () => controller.abort();
  }, [
    userResponses?.destination_city_id,
    userResponses?.destinationCityId,
    userResponses?.destination,
    userResponses?.destinationCityName,
    userResponses?.cityName,
    userResponses?.citySlug,
  ]);

  // initial setup (reset if not logged in)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setCurrentStep(0);
      setUserResponses({});
      localStorage.removeItem("currentStep");
      localStorage.removeItem("userResponses");
      sessionStorage.removeItem("orderSaved");
      sessionStorage.setItem("hasLoggedIn", "true");
    }
  }, []);

  // build steps (prefer API hotels)
  const mergedHotels = hotelsFromApi.length ? hotelsFromApi : loadedHotels;
  const steps = createSteps(
    userResponses,
    loadedCities,
    loadedFlights,
    mergedHotels,
    loadedAttractions
  );

  // handle "payment only" deep link
  useEffect(() => {
    if (location.state?.onlyPayment) {
      const paymentStepIndex = steps.findIndex((s) => s.label === "Payment");
      setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
      setPaymentCompleted(false);
      setIsPaymentModalOpen(true);
    }
  }, [location.state, steps]);

  // persist progress & responses
  useEffect(() => {
    localStorage.setItem("currentStep", currentStep);
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("userResponses", JSON.stringify(userResponses));
  }, [userResponses]);

  // UI helpers
  const renderProgressBar = () => (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
      />
    </div>
  );

  const renderStepContent = () => {
    const step = steps[currentStep];
    if (!step || !Array.isArray(step.questions)) {
      return <div style={{ color: "red" }}>Error: Step misconfigured or not found.</div>;
    }
    if (step.label === "Trip Summary") {
      return (
      <TripSummary
  userResponses={userResponses}
  setUserResponses={setUserResponses}
  setCurrentStep={setCurrentStep}
  setPaymentCompleted={setPaymentCompleted}
  onRestart={restartTrip}                 // <-- this makes the button work
  personalAreaPath="/personal-area"       // adjust if your route is different
/>

      );
    }
    return (
      <StepContent
        step={step}
        userResponses={userResponses}
        setUserResponses={setUserResponses}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        steps={steps}
        paymentCompleted={paymentCompleted}
        setIsPaymentModalOpen={setIsPaymentModalOpen}
        setPaymentCompleted={setPaymentCompleted}
      />
    );
  };

  return (
    <div className="planner-page">
      <div className="containerCh">
        <header className="card-header">
          <h1>Travel Planner</h1>
          <Stepper steps={steps} currentStep={currentStep} />
          <div className="card-progress">{renderProgressBar()}</div>
        </header>

        {renderStepContent()}

   <PaymentModal
  isOpen={isPaymentModalOpen}
  onClose={() => setIsPaymentModalOpen(false)}
// FIXED Payment Success Handler in Chat.jsx
onPaymentSuccess={async ({ attractionIds, attractionNames } = {}) => {
  console.log("💳 Payment success called with:", { attractionIds, attractionNames });
  
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  if (!token) {
    alert("You must be logged in to save the order.");
    return;
  }

  // Build headers once
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const getVal = (prompt) => userResponses?.[prompt];

  try {
    console.log("🔍 Current userResponses:", userResponses);
// ADD THIS AT THE VERY BEGINNING OF onPaymentSuccess function
console.log("=== DEBUG START ===");
console.log("📋 All userResponses keys:", Object.keys(userResponses));

// Check each key one by one
Object.keys(userResponses).forEach(key => {
  const value = userResponses[key];
  console.log(`📋 "${key}":`, typeof value, value);
  
  if (value && typeof value === 'object') {
    console.log(`   📋 Object keys for "${key}":`, Object.keys(value));
  }
});

// Specifically look for departure/destination
const depKey = "What is your departure city?";
const dstKey = "What is your destination city?";

console.log("🔍 Looking for departure key:", depKey);
console.log("🔍 Departure exists?", depKey in userResponses);
console.log("🔍 Departure value:", userResponses[depKey]);

console.log("🔍 Looking for destination key:", dstKey);
console.log("🔍 Destination exists?", dstKey in userResponses);
console.log("🔍 Destination value:", userResponses[dstKey]);
const looksLikeObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

console.log("=== DEBUG END ===");
    // 1) Extract values from userResponses
    const dep = getVal("What is your departure city?");
    const dst = getVal("What is your destination city?");
    const flt = getVal("Select your flight");
    const htl = getVal("Select your hotel");

    console.log("🔍 Extracted values:", { dep, dst, flt, htl });
const depName = getCityName(dep, loadedCities);
const dstName = getCityName(dst, loadedCities);
    // 2) IMPROVED: Extract meaningful values for the resolve endpoint
 // Chat.jsx (fix)
// --- helpers used to build the /resolve body ---
const getCityName = (city, fallbackList = []) => {
  if (!city) return "";
  if (typeof city === "string") {
    // if it's a plain name, use it; if it's an id, try to map via fallbackList
    if (!looksLikeObjectId(city)) return city.trim();
    const hit = Array.isArray(fallbackList)
      ? fallbackList.find(c => String(c._id || c.id) === city)
      : null;
    return (hit?.city || hit?.name || hit?.label || hit?.title || "").trim();
  }
    return (
    city.city ||
    city.name ||
    city.cityName ||
    city.label ||
    city.title ||
    city.slug ||
    ""
  ).trim();
};

const extractCityValue = (city) => {
  if (!city) return "";
  if (typeof city === "string") return city.trim();
  return (
    city._id ||        // prefer ObjectId
    city.id ||
    city.city ||
    city.name ||
    city.cityName ||
    city.label ||
    city.title ||
    city.slug ||
    ""
  );
};
const getCityId = (city) => {
  if (!city || typeof city !== "object") return null;
  const s = String(city._id || city.id || "").trim();
  return looksLikeObjectId(s) ? s : null;
};
const extractFlightValue = (flight) => {
  if (!flight) return "";
  if (typeof flight === "string") return flight.trim();
  return (
    flight.compoundId ||
    flight.code ||
    flight.name ||
    flight.airline ||
    flight.id ||
    flight._id ||
    ""
  );
};

const extractHotelValue = (hotel) => {
  if (!hotel) return "";
  if (typeof hotel === "string") return hotel.trim();
  return (
    hotel.compoundId ||
    hotel._id ||
    hotel.id ||
    hotel.name ||
    hotel.hotelName ||
    hotel.label ||
    hotel.title ||
    ""
  );
};


    // 3) Build resolve request body with cleaned values
const resolveBody = {
  departure: depName,                // <-- always a name
  destination: dstName,              // <-- always a name
  departureCityId: getCityId(dep),   // optional fast-path
  destinationCityId: getCityId(dst), // optional fast-path
  flight: extractFlightValue(flt),
  hotel:  extractHotelValue(htl),
};

console.log("📤 Sending to resolve endpoint:", resolveBody);

if (!resolveBody.departure || !resolveBody.destination) {
  throw new Error("Missing departure or destination city. Please select cities.");
}


    console.log("📤 Sending to resolve endpoint:", resolveBody);

    // 4) Validate we have required data before sending
    if (!resolveBody.departure || !resolveBody.destination) {
      console.error("❌ Missing required city data:", {
        departure: resolveBody.departure,
        destination: resolveBody.destination,
        originalDep: dep,
        originalDst: dst
      });
      throw new Error("Missing departure or destination city. Please go back and select cities.");
    }

    // 5) Call resolve endpoint
    const r1 = await fetch(`${API_BASE}/api/order/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify(resolveBody),
    });

    if (!r1.ok) {
      const errorText = await r1.text();
      console.error("❌ Resolve failed:", r1.status, errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || `Resolve failed (HTTP ${r1.status})`;
      } catch {
        errorMessage = `Resolve failed (HTTP ${r1.status}): ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const { ids } = await r1.json();
    console.log("✅ Resolved IDs:", ids);

    // 6) Prepare create order payload
    const payMethodRaw = getVal("Select payment method");
    const paymentMethod = typeof payMethodRaw === "string"
      ? payMethodRaw
      : (payMethodRaw?.name || payMethodRaw?.id || "Unknown");
    
    const transportation = getVal("Select your mode of transportation") || "—";
    const totalPrice = calculateTotalPrice(userResponses);

    const cleanAttractionIds = Array.isArray(attractionIds)
      ? attractionIds.filter(id => id && typeof id === "string")
      : [];
    const cleanAttractionNames = Array.isArray(attractionNames)
      ? attractionNames.filter(name => name && typeof name === "string")
      : [];

    console.log("🎯 Clean attractions:", { cleanAttractionIds, cleanAttractionNames });

    // Helper to extract display name
    const getDisplayName = (data) => {
      if (typeof data === "string") return data;
      return (
        data?.name ||
        data?.city ||
        data?.title ||
        data?.airline ||
        data?.label ||
        data?.hotelName ||
        data?.cityName ||
        ""
      );
    };

const payload = {
  departureCityId: ids.departureCityId,
  destinationCityId: ids.destinationCityId,
  flightId: ids.flightId,
  hotelId: ids.hotelId,

  selectAllCityAttractions: true,
  attractionNames: [],
  attractions: [],

  flightName: getDisplayName(flt) || null,
  hotelName: getDisplayName(htl) || null,
  transportation,
  paymentMethod,
  totalPrice,
};



    console.log("📤 Sending to create order:", payload);

    // 7) Create the order
    const r2 = await fetch(`${API_BASE}/api/order`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!r2.ok) {
      const errorText = await r2.text();
      console.error("❌ Create order failed:", r2.status, errorText);
      
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || `Create failed (HTTP ${r2.status})`;
      } catch {
        errorMessage = `Create failed (HTTP ${r2.status}): ${errorText}`;
      }
      throw new Error(errorMessage);
    }

  try {
  const result = await r2.json();
  console.log("✅ Order created successfully:", result);

  // store orderSaved and orderId
  sessionStorage.setItem("orderSaved", "1");
  if (result?._id) sessionStorage.setItem("lastOrderId", result._id);

  setPaymentCompleted(true);
  setCurrentStep((prev) => prev + 1);

  // 🔔 instead of alert, trigger toast
  setToast({ type: "success", text: "✅ Order saved!" });
  setTimeout(() => setToast(null), 3000);

} catch (err) {
  console.error("❌ Save order error:", err);

  setToast({ type: "error", text: `Failed to save order: ${err.message}` });
  setTimeout(() => setToast(null), 4000);
}
    } catch (err) {
      console.error("❌ Payment success error:", err);
}}}
  totalAmount={calculateTotalPrice(userResponses)}
  userResponses={userResponses}
/>{toast && (
  <div className={`toast ${toast.type}`}>
    {toast.text}
  </div>
)}


      </div>
    </div>
  );
};

export default TravelPlannerApp;
