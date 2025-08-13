
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../assets/styles/chat.css";

// Import separated components and utilities
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

    // State management
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

    // Custom hook for travel data
    const { loadedCities, loadedFlights, loadedHotels, loadedAttractions } = useTravelData(userResponses);

    // Initial setup effect
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

    // Handle payment-only navigation
    useEffect(() => {
        if (location.state?.onlyPayment) {
            const steps = createSteps(userResponses, loadedCities, loadedFlights, loadedHotels, loadedAttractions);
            const paymentStepIndex = steps.findIndex(s => s.label === "Payment");
            setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
            setPaymentCompleted(false);
            setIsPaymentModalOpen(true);
        }
    }, [location.state, userResponses, loadedCities, loadedFlights, loadedHotels, loadedAttractions]);

    // Save current step to localStorage
    useEffect(() => {
        localStorage.setItem("currentStep", currentStep);
    }, [currentStep]);

    // Save responses to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem("userResponses", JSON.stringify(userResponses));
    }, [userResponses]);

    // Create steps configuration
    const steps = createSteps(userResponses, loadedCities, loadedFlights, loadedHotels, loadedAttractions);

    // Progress bar component
    const renderProgressBar = () => (
        <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}></div>
        </div>
    );

    // Main render method for step content
    const renderStepContent = () => {
        const step = steps[currentStep];

        if (!step || !Array.isArray(step.questions)) {
            return <div style={{ color: "red" }}>Error: Step misconfigured or not found.</div>;
        }

        // Render Trip Summary component
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

        // Render regular step content
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