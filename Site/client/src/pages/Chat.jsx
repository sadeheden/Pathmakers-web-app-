import React, { useState, useEffect } from "react";
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

        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

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
  onPaymentSuccess={async ({ attractionIds, attractionNames } = {}) => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    if (!token) {
      alert("You must be logged in to save the order.");
      return;
    }

    const getVal = (prompt) => userResponses?.[prompt];
    const textOrName = (v) =>
      typeof v === "string" ? v : (v?.name || v?.city || v?.title || v?.airline || v?.label);

    try {
      // 1) Build flexible inputs for resolver
      const dep = getVal("What is your departure city?");
      const dst = getVal("What is your destination city?");
      const flt = getVal("Select your flight");
      const htl = getVal("Select your hotel");

      const resolveBody = {
        departure: dep?.id || dep,          // id or name/slug
        destination: dst?.id || dst,
        flight: flt?.id || textOrName(flt), // id or name/code
        hotel: htl?.id || textOrName(htl),  // id or name
      };

      // 2) Resolve IDs (server returns compound flight/hotel ids)
      const r1 = await fetch(`${API_BASE}/api/order/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(resolveBody),
      });
      if (!r1.ok) {
        const j = await r1.json().catch(() => ({}));
        throw new Error(j.message || `Resolve failed (HTTP ${r1.status})`);
      }
      const { ids } = await r1.json();

      // 3) Prepare create payload
      const payMethodRaw = getVal("Select payment method");
      const paymentMethod = typeof payMethodRaw === "string" ? payMethodRaw : (payMethodRaw?.name || payMethodRaw?.id || "Unknown");
      const transportation = getVal("Select your mode of transportation") || "—";
      const totalPrice = calculateTotalPrice(userResponses);

      const payload = {
        departureCityId: ids.departureCityId,
        destinationCityId: ids.destinationCityId,
        flightId: ids.flightId,     // compound id "baseId-index"
        hotelId: ids.hotelId,       // compound id "baseId-index" or city fallback
        attractions: Array.isArray(attractionIds) ? attractionIds : [],
        attractionNames: Array.isArray(attractionNames) ? attractionNames : [],
        flightName: textOrName(flt) || null,
        hotelName: textOrName(htl) || null,
        transportation,
        paymentMethod,
        totalPrice,
      };

      // 4) Create order
      const r2 = await fetch(`${API_BASE}/api/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r2.ok) {
        const j = await r2.json().catch(() => ({}));
        throw new Error(j.message || `Create failed (HTTP ${r2.status})`);
      }
      

      // success UI
      sessionStorage.setItem("orderSaved", "1");
      setPaymentCompleted(true);
      setCurrentStep((prev) => prev + 1);
      alert("✅ Order saved!");
    } catch (err) {
      console.error("save order error:", err);
      alert(`Failed to save order: ${err.message}`);
    }
  }}
  totalAmount={calculateTotalPrice(userResponses)}
  userResponses={userResponses}
/>

      </div>
    </div>
  );
};

export default TravelPlannerApp;
