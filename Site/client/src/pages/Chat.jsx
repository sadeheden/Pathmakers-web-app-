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
  "https://pathmakers-server-site.onrender.com";

const TravelPlannerApp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || token === "null" || token === "undefined") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const savingOrderRef = useRef(false);
  const [toast, setToast] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [conflictModal, setConflictModal] = useState({ open: false, message: "" });
  const [dateWarning, setDateWarning] = useState({ show: false, message: "" });

  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem("currentStep");
    return savedStep ? parseInt(savedStep, 10) : 0;
  });

  const [userResponses, setUserResponses] = useState(() => {
    const savedResponses = localStorage.getItem("userResponses");
    return savedResponses ? JSON.parse(savedResponses) : {};
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const restartTrip = React.useCallback(() => {
    try {
      setIsPaymentModalOpen(false);
      setPaymentCompleted(false);
      setUserResponses({});
      setCurrentStep(0);
      setDateWarning({ show: false, message: "" });
      localStorage.removeItem("currentStep");
      localStorage.removeItem("userResponses");
      sessionStorage.removeItem("orderSaved");
    } finally {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const {
    loadedCities = [],
    loadedFlights = [],
    loadedHotels = [],
    loadedAttractions = [],
  } = useTravelData(userResponses) || {};

  const [hotelsFromApi, setHotelsFromApi] = useState([]);

  useEffect(() => {
    const onAppLogout = () => {
      setIsPaymentModalOpen(false);
      setPaymentCompleted(false);
      setUserResponses({});
      setCurrentStep(0);
      setDateWarning({ show: false, message: "" });
      localStorage.removeItem("currentStep");
      localStorage.removeItem("userResponses");
      sessionStorage.removeItem("orderSaved");
      sessionStorage.removeItem("lastOrderId");
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
    };

    window.addEventListener("app:logout", onAppLogout);
    const onStorage = (e) => {
      if (e.key === "app:logout") onAppLogout();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:logout", onAppLogout);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

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

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setCurrentStep(0);
      setUserResponses({});
      setDateWarning({ show: false, message: "" });
      localStorage.removeItem("currentStep");
      localStorage.removeItem("userResponses");
      sessionStorage.removeItem("orderSaved");
      sessionStorage.setItem("hasLoggedIn", "true");
    }
  }, []);

  const mergedHotels = hotelsFromApi.length ? hotelsFromApi : loadedHotels;
  const steps = createSteps(
    userResponses,
    loadedCities,
    loadedFlights,
    mergedHotels,
    loadedAttractions
  );

  useEffect(() => {
    if (location.state?.onlyPayment) {
      const paymentStepIndex = steps.findIndex((s) => s.label === "Payment");
      setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
      setPaymentCompleted(false);
      setIsPaymentModalOpen(true);
    }
  }, [location.state, steps]);

  useEffect(() => {
    localStorage.setItem("currentStep", currentStep);
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("userResponses", JSON.stringify(userResponses));
  }, [userResponses]);

  useEffect(() => {
    const checkDateConflict = async () => {
      const START_KEY = "Select trip start date";
      const END_KEY = "Select trip end date";
      
      const startDate = userResponses?.[START_KEY];
      const endDate = userResponses?.[END_KEY];
      
      if (!startDate || !endDate) {
        setDateWarning({ show: false, message: "" });
        return;
      }

  const toDate = (v) => {
    if (!v) return null;
    const raw = (v && typeof v === "object" && v.$d instanceof Date) ? v.$d : v;
    if (raw instanceof Date && !Number.isNaN(raw)) return raw;
    if (typeof raw === "string") {
      const d = new Date(raw);
      return !Number.isNaN(+d) ? d : null;
    }
    return null;
  };

  const start = toDate(startDate);
  const end = toDate(endDate);

  if (start && end && end <= start) {
    setDateWarning({
      show: true,
      message: "End date must be later than start date.",
    });
    return;
  }

      const toYMD = (v) => {
        if (!v) return null;
        const raw = (v && typeof v === "object" && v.$d instanceof Date) ? v.$d : v;
        if (raw instanceof Date && !Number.isNaN(raw)) {
          const y = raw.getUTCFullYear();
          const m = String(raw.getUTCMonth() + 1).padStart(2, "0");
          const d = String(raw.getUTCDate()).padStart(2, "0");
          return `${y}-${m}-${d}`;
        }
        if (typeof raw === "string") {
          const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
          if (ISO_DATE_RE.test(raw.trim())) return raw.trim();
          const d = new Date(raw);
          if (!Number.isNaN(+d)) return toYMD(d);
        }
        return null;
      };

      const tripStartYMD = toYMD(startDate);
      const tripEndYMD = toYMD(endDate);

      if (!tripStartYMD || !tripEndYMD) return;

      try {
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("token") ||
          localStorage.getItem("jwt");

        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
          `${API_BASE}/api/order/conflicts?start=${encodeURIComponent(tripStartYMD)}&end=${encodeURIComponent(tripEndYMD)}`,
          { headers }
        );
        
        const data = await res.json().catch(() => ({}));
        
        if (data?.conflict) {
          const first = Array.isArray(data.overlaps) && data.overlaps[0];
          const msg = first
            ? `You already have a trip${first.destination ? ` to ${first.destination}` : ""} from ${new Date(first.start).toLocaleDateString()} to ${new Date(first.end).toLocaleDateString()}.`
            : (data.message || "You already have a trip on these dates.");
          
          setDateWarning({ show: true, message: msg });
        } else {
          setDateWarning({ show: false, message: "" });
        }
      } catch (error) {
        console.warn("Date conflict check failed:", error);
        setDateWarning({ show: false, message: "" });
      }
    };

    checkDateConflict();
  }, [userResponses?.["Select trip start date"], userResponses?.["Select trip end date"]]);

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
          onRestart={restartTrip}
          personalAreaPath="/personal-area"
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

        {dateWarning.show && (
          <div
            role="alert"
            style={{
              position: "fixed",
              top: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9998,
              background: "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)",
              border: "2px solid #ffc107",
              borderRadius: 12,
              padding: "16px 20px",
              maxWidth: "min(90vw, 600px)",
              boxShadow: "0 8px 24px rgba(255, 193, 7, 0.25)",
              animation: "slideDown 0.3s ease-out"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: 24, lineHeight: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#856404", marginBottom: 4 }}>
                  Date Conflict Warning
                </div>
                <div style={{ fontSize: 14, color: "#856404" }}>
                  {dateWarning.message}
                </div>
              </div>
              <button
                onClick={() => setDateWarning({ show: false, message: "" })}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 24,
                  lineHeight: 1,
                  cursor: "pointer",
                  color: "#856404",
                  padding: 0,
                  width: 24,
                  height: 24
                }}
                aria-label="Dismiss warning"
              >
                ×
              </button>
            </div>
            <style>{`
              @keyframes slideDown {
                from {
                  opacity: 0;
                  transform: translateX(-50%) translateY(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateX(-50%) translateY(0);
                }
              }
            `}</style>
          </div>
        )}

        {conflictModal.open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-title"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setConflictModal({ open: false, message: "" });
                restartTrip();
              }
            }}
          >
            <div
              style={{
                background: "#fff",
                width: "min(92vw, 520px)",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
                border: "1px solid rgba(0,0,0,0.06)",
                padding: "22px 20px 16px",
                position: "relative"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                aria-label="Close"
                onClick={() => {
                  setConflictModal({ open: false, message: "" });
                  restartTrip();
                }}
                style={{
                  position: "absolute",
                  insetInlineEnd: 10,
                  top: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 20,
                  lineHeight: "20px",
                  cursor: "pointer"
                }}
              >
                ×
              </button>

              <h3 id="conflict-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#111827" }}>
                Trip Date Conflict
              </h3>

              <p style={{ marginTop: 10, marginBottom: 18, color: "#334155" }}>
                {conflictModal.message}
              </p>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setConflictModal({ open: false, message: "" });
                    restartTrip();
                  }}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => !isPlacingOrder && setIsPaymentModalOpen(false)}
          busy={isPlacingOrder}
          total={calculateTotalPrice(userResponses)}
          totalAmount={calculateTotalPrice(userResponses)}
          onPaymentSuccess={async ({ attractionIds, attractionNames } = {}) => {
            setIsPaymentModalOpen(false);
            setIsPlacingOrder(true);
            
            if (sessionStorage.getItem("orderSaved") === "1") {
              setToast({ type: "success", text: "Order already saved." });
              setTimeout(() => setToast(null), 2000);
              setIsPlacingOrder(false);
              return;
            }
            
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
              
              const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

              const toYMD = (v) => {
                if (!v) return null;
                const raw = (v && typeof v === "object" && v.$d instanceof Date) ? v.$d : v;
                if (raw instanceof Date && !Number.isNaN(raw)) {
                  const y = raw.getUTCFullYear();
                  const m = String(raw.getUTCMonth() + 1).padStart(2, "0");
                  const d = String(raw.getUTCDate()).padStart(2, "0");
                  return `${y}-${m}-${d}`;
                }
                if (typeof raw === "string") {
                  if (ISO_DATE_RE.test(raw.trim())) return raw.trim();
                  const d = new Date(raw);
                  if (!Number.isNaN(+d)) return toYMD(d);
                }
                return null;
              };

              const pickDate = (preferredKeys = []) => {
                for (const k of preferredKeys) {
                  const ymd = toYMD(getVal(k));
                  if (ymd) return ymd;
                }
                for (const v of Object.values(userResponses || {})) {
                  const ymd = toYMD(v);
                  if (ymd) return ymd;
                }
                return null;
              };

              const getVal = (prompt) => userResponses?.[prompt];
              const START_KEY = "Select trip start date";
              const END_KEY = "Select trip end date";
              const tripStartYMD = pickDate([START_KEY, "Trip start date", "Start date", "From"]);
              const tripEndYMD = pickDate([END_KEY, "Trip end date", "End date", "To"]);

              console.log("📅 Dates before save:", {
                start: getVal(START_KEY),
                end: getVal(END_KEY),
              });

              if (!tripStartYMD || !tripEndYMD) {
                setToast({ type: "error", text: "Please select trip start and end dates." });
                setTimeout(() => setToast(null), 3000);
                setIsPlacingOrder(false);
                savingOrderRef.current = false;
                return;
              }

              try {
                const r0 = await fetch(`${API_BASE}/api/order/conflicts?start=${encodeURIComponent(tripStartYMD)}&end=${encodeURIComponent(tripEndYMD)}`, { headers });
                const j0 = await r0.json().catch(() => ({}));
                if (j0?.conflict) {
                  const first = Array.isArray(j0.overlaps) && j0.overlaps[0];
                  const msg = first
                    ? `You already have a trip ${first.destination ? `to ${first.destination} ` : ""}from ${new Date(first.start).toLocaleDateString()} to ${new Date(first.end).toLocaleDateString()}.`
                    : (j0.message || "You already have a trip on these dates.");

                  setConflictModal({ open: true, message: `⚠️ ${msg}` });
                }
              } catch (e) {
                console.warn("Conflict preflight failed:", e);
              }

              const looksLikeObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
              
              let finalAttractionIds = Array.isArray(attractionIds)
                ? attractionIds.filter(looksLikeObjectId)
                : [];

              let finalAttractionNames = Array.isArray(attractionNames)
                ? attractionNames.filter((n) => typeof n === "string" && n.trim())
                : [];

              if (!finalAttractionIds.length) {
                const picked = userResponses?.["Select attractions to visit"];
                const selected = Array.isArray(picked) ? picked.flat(Infinity) : (picked ? [picked] : []);
                const pool = Array.isArray(loadedAttractions) ? loadedAttractions : [];

                for (const a of selected) {
                  if (typeof a === "string") {
                    if (looksLikeObjectId(a)) {
                      finalAttractionIds.push(a);
                    } else {
                      const hit = pool.find((x) =>
                        [x?.name, x?.title, x?.label]
                          .map((s) => (s || "").trim().toLowerCase())
                          .includes(a.trim().toLowerCase())
                      );
                      const id = String(hit?._id || hit?.id || "");
                      if (looksLikeObjectId(id)) finalAttractionIds.push(id);
                      else finalAttractionNames.push(a);
                    }
                  } else if (a && typeof a === "object") {
                    const id = String(a._id || a.id || "").trim();
                    if (looksLikeObjectId(id)) finalAttractionIds.push(id);
                    else if (a.name) finalAttractionNames.push(a.name);
                  }
                }
              }

              finalAttractionIds = [...new Set(finalAttractionIds)];
              finalAttractionNames = [...new Set(finalAttractionNames)];

              const getCityName = (city, list = []) => {
                if (!city) return "";
                if (typeof city === "string") {
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

              const dep = getVal("What is your departure city?");
              const dst = getVal("What is your destination city?");
              const flt = getVal("Select your flight");
              const htl = getVal("Select your hotel");

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

              if (sessionStorage.getItem("orderSaved") === "1") {
                setToast({ type: "success", text: "Order already saved." });
                setTimeout(() => setToast(null), 2000);
                return;
              }

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
                selectAllCityAttractions: finalAttractionIds.length === 0,
                attractionNames: finalAttractionNames,
                attractions: finalAttractionIds,
                flightName: getDisplayName(flt) || null,
                hotelName: getDisplayName(htl) || null,
                transportation,
                paymentMethod,
                totalPrice,
                tripStartDate: tripStartYMD,
                tripEndDate: tripEndYMD,
              };

              const r2 = await fetch(`${API_BASE}/api/order`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
              });

              if (r2.status === 409) {
                const j = await r2.json().catch(() => ({}));
                const msg =
                  j?.message ||
                  (j?.conflict ? "You already have a trip on these dates." : "Conflict.");
                setToast({ type: "error", text: `❌ ${msg}` });
                setTimeout(() => setToast(null), 4500);
                setIsPlacingOrder(false);
                savingOrderRef.current = false;
                return;
              }

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
              if (result?._id) {
                sessionStorage.setItem("lastOrderId", result._id);
                setUserResponses(prev => ({ ...prev, orderId: result._id }));
              }
              
              setPaymentCompleted(true);
              setCurrentStep((prev) => prev + 1);
              setToast({ type: "success", text: "✅ Order saved!" });
              setTimeout(() => setToast(null), 3000);
            } catch (err) {
              console.error("❌ Payment success error:", err);
              setToast({ type: "error", text: String(err.message || err) });
              setTimeout(() => setToast(null), 4000);
            } finally {
              setIsPlacingOrder(false);
              savingOrderRef.current = false;
            }
          }}
        />

        {isPlacingOrder && (
          <div
            role="alert"
            aria-live="assertive"
            aria-busy="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
      zIndex: 9999
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "20px 24px",
        minWidth: 260,
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        border: "1px solid rgba(0,0,0,0.06)"
      }}
    >
      {/* spinner */}
      <div
        style={{
          width: 36,
          height: 36,
          margin: "0 auto 12px",
          border: "4px solid #e5e7eb",
          borderTopColor: "#004e75", // your --brand
          borderRadius: "50%",
          animation: "pmk-spin 0.9s linear infinite"
        }}
      />
      <div style={{ fontWeight: 700, color: "#004e75", marginBottom: 4 }}>
        Processing payment…
      </div>
      <div style={{ fontSize: 13, color: "#334155" }}>
        Please wait while we create your order.
      </div>
    </div>

    {/* inline keyframes */}
    <style>{`
      @keyframes pmk-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
)}


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
