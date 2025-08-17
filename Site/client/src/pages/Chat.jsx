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
  onPaymentSuccess={({ attractionIds, attractionNames } = {}) => {
    // use attractionIds / attractionNames in your POST payload
    // (fall back to []) to be safe
    const ids = attractionIds ?? [];
    const names = attractionNames ?? [];
    // ... axios.post({ attractions: ids, attractionNames: names, ... })
    setPaymentCompleted(true);
    setCurrentStep((prev) => prev + 1);
  }}
  totalAmount={calculateTotalPrice(userResponses)}
  userResponses={userResponses}
/>

      </div>
    </div>
  );
};

export default TravelPlannerApp;
