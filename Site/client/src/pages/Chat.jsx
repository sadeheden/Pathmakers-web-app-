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
  // prevent duplicate saves in the same session
  if (sessionStorage.getItem("orderSaved") === "1") {
    setToast({ type: "success", text: "Order already saved." });
    setTimeout(() => setToast(null), 2000);
    return;
  }
  // prevent concurrent double-clicks
  if (savingOrderRef.current) return;
  savingOrderRef.current = true;

  try {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    if (!token) {
      alert("You must be logged in to save the order.");
      return;
    }

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const getVal = (prompt) => userResponses?.[prompt];

    // ---------- helpers (declare BEFORE use) ----------
   const looksLikeObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const getCityIdFromAny = (city) => {
  if (!city) return null;
  if (typeof city === "string") return looksLikeObjectId(city) ? city : null;
  const s = String(city._id || city.id || "").trim();
  return looksLikeObjectId(s) ? s : null;
};

// returns a displayable city name when you already have one
const getCityNameFromAny = (city) => {
  if (!city) return "";
  if (typeof city === "string") return city.trim();
  return (
    city.city || city.name || city.cityName ||
    city.label || city.title || city.slug || ""
  ).trim();
};

// fetch city by name to get its canonical id from your backend
const fetchCityIdByName = async (name, headers) => {
  const res = await fetch(`${API_BASE}/api/cities/name/${encodeURIComponent(name)}`, { headers });
  if (!res.ok) return null; // treat not-found as null; we'll error later if needed
  const data = await res.json();
  // adapt this to your controller's payload shape if different
  const doc = data?.data || data?.city || data; 
  const id = String(doc?._id || doc?.id || "").trim();
  return looksLikeObjectId(id) ? id : null;
};
    const getCityName = (city, list = []) => {
      if (!city) return "";
      if (typeof city === "string") {
        // plain name => use; objectId-like => map via list
        if (!looksLikeObjectId(city)) return city.trim();
        const hit = Array.isArray(list)
          ? list.find((c) => String(c._id || c.id) === city)
          : null;
        return (
          (hit?.city || hit?.name || hit?.label || hit?.title || "").trim()
        );
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
    // --------------------------------------------------

    // 1) read selections
    const dep = getVal("What is your departure city?");
    const dst = getVal("What is your destination city?");
    const flt = getVal("Select your flight");
    const htl = getVal("Select your hotel");

    // 2) map to names (backend expects names), include optional ids
    const depName = getCityName(dep, loadedCities);
    const dstName = getCityName(dst, loadedCities);

    const resolveBody = {
      departure: depName,
      destination: dstName,
      departureCityId: getCityId(dep) || undefined,
      destinationCityId: getCityId(dst) || undefined,
      flight: extractFlightValue(flt),
      hotel: extractHotelValue(htl),
    };

    if (!resolveBody.departure || !resolveBody.destination) {
      throw new Error("Missing departure or destination city. Please select cities.");
    }

    // 3) resolve ids on server
    const r1 = await fetch(`${API_BASE}/api/order/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify(resolveBody),
    });
    if (!r1.ok) {
      const text = await r1.text();
      try {
        const j = JSON.parse(text);
        throw new Error(j.message || `Resolve failed (${r1.status})`);
      } catch {
        throw new Error(`Resolve failed (${r1.status}): ${text}`);
      }
    }
    const { ids } = await r1.json();

    // if another tab just saved while we were resolving
    if (sessionStorage.getItem("orderSaved") === "1") {
      setToast({ type: "success", text: "Order already saved." });
      setTimeout(() => setToast(null), 2000);
      return;
    }

    // 4) build order payload
    const payMethodRaw = getVal("Select payment method");
    const paymentMethod =
      typeof payMethodRaw === "string"
        ? payMethodRaw
        : payMethodRaw?.name || payMethodRaw?.id || "Unknown";

    const transportation =
      getVal("Select your mode of transportation") || "—";
    const totalPrice = calculateTotalPrice(userResponses);

    const payload = {
      departureCityId: ids.departureCityId,
      destinationCityId: ids.destinationCityId,
      flightId: ids.flightId,
      hotelId: ids.hotelId,

      // include all destination attractions server-side
      selectAllCityAttractions: true,
      attractionNames: [],
      attractions: [],

      flightName: getDisplayName(flt) || null,
      hotelName: getDisplayName(htl) || null,
      transportation,
      paymentMethod,
      totalPrice,
    };

    // 5) create order
    const r2 = await fetch(`${API_BASE}/api/order`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!r2.ok) {
      const text = await r2.text();
      try {
        const j = JSON.parse(text);
        throw new Error(j.message || `Create failed (${r2.status})`);
      } catch {
        throw new Error(`Create failed (${r2.status}): ${text}`);
      }
    }

    const result = await r2.json();
    sessionStorage.setItem("orderSaved", "1");
    if (result?._id) sessionStorage.setItem("lastOrderId", result._id);

    setPaymentCompleted(true);
    setCurrentStep((prev) => prev + 1);
    setToast({ type: "success", text: "✅ Order saved!" });
    setTimeout(() => setToast(null), 3000);
  } catch (err) {
    console.error("❌ Payment success error:", err);
    setToast({ type: "error", text: String(err.message || err) });
    setTimeout(() => setToast(null), 4000);
  } finally {
    savingOrderRef.current = false;
  }
}}
        />

        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.text}
            <button onClick={() => setToast(null)}>&times;</button>
          </div>
        )}

     
      </div>
    </div>
  );
};

export default TravelPlannerApp;
