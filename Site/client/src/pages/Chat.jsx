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

const TravelPlannerApp = () => {
  const location = useLocation();
  const navigate = useNavigate();

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

  /* ===== Travel data from hook (MUST exist before effects/steps) ===== */
  const {
    loadedCities = [],
    loadedFlights = [],
    loadedHotels = [],
    loadedAttractions = [],
  } = useTravelData(userResponses) || {};

  /* ===== LIVE hotels from API (by chosen destination) ===== */
  const [hotelsFromApi, setHotelsFromApi] = useState([]);

  useEffect(() => {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    if (!token) return;

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
        const res = await fetch(`/api/hotels/city/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const hotels = Array.isArray(data.hotels)
          ? data.hotels
          : Array.isArray(data?.data?.hotels)
          ? data.data.hotels
          : [];
        const normalized = hotels.map((h, idx) => ({
          id: h._id || h.id || h.optionId || `${h.parentId || "h"}-${idx}`,
          name: h.name || h.hotelName || "Hotel",
          price: h.price ?? h.cost ?? null,
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

  /* ===== Initial setup effect (login reset) ===== */
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

  /* ===== Build steps (prefer API hotels when available) ===== */
  const mergedHotels = hotelsFromApi.length ? hotelsFromApi : loadedHotels;
  const steps = createSteps(
    userResponses,
    loadedCities,
    loadedFlights,
    mergedHotels,
    loadedAttractions
  );

  /* ===== Handle "payment only" navigation ===== */
  useEffect(() => {
    if (location.state?.onlyPayment) {
      const paymentStepIndex = steps.findIndex((s) => s.label === "Payment");
      setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
      setPaymentCompleted(false);
      setIsPaymentModalOpen(true);
    }
  }, [location.state, steps]);

  /* ===== Persist progress & responses ===== */
  useEffect(() => {
    localStorage.setItem("currentStep", currentStep);
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem("userResponses", JSON.stringify(userResponses));
  }, [userResponses]);

  /* ===== UI helpers ===== */
  const renderProgressBar = () => (
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
      ></div>
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
          onPaymentSuccess={async () => {
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
