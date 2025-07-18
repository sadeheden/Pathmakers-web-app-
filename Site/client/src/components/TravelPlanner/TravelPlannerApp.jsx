import React, { useState, useEffect } from "react";
import "../../assets/styles/chat.css";
import { useLocation, useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import StepContent from "./StepContent";
import PaymentModal from "./PaymentModal";
import { cleanId } from "./helpers";
import steps from "./steps";

function TravelPlannerApp() {
    const location = useLocation();
    const navigate = useNavigate();

    // STATE
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

    // Persist current step and responses
    useEffect(() => {
        localStorage.setItem("currentStep", currentStep);
    }, [currentStep]);
    useEffect(() => {
        localStorage.setItem("userResponses", JSON.stringify(userResponses));
    }, [userResponses]);

    // Handle payment-only flow
    useEffect(() => {
        if (location.state?.onlyPayment) {
            const paymentStepIndex = steps.findIndex(s => s.label === "Payment");
            setCurrentStep(paymentStepIndex !== -1 ? paymentStepIndex : 0);
            setPaymentCompleted(false);
            setIsPaymentModalOpen(true);
        }
    }, [location.state]);

    // Core: calculate total price (should match what StepContent expects)
    function calculateTotalPrice() {
        let total = 0;
        const selectedFlight = userResponses["Select your flight"];
        if (selectedFlight?.price) total += selectedFlight.price;
        const selectedHotel = userResponses["Select your hotel"];
        if (selectedHotel?.price) total += selectedHotel.price;
        const selectedAttractions = userResponses["Select attractions to visit"];
        if (Array.isArray(selectedAttractions)) {
            selectedAttractions.forEach(attr => { if (attr?.price) total += attr.price; });
        }
        const selectedTransportation = userResponses["Select your mode of transportation"];
        if (selectedTransportation) total += selectedTransportation === "Car" ? 50 : 10;
        const numberOfTravelers = parseInt(userResponses["Number of travelers"]) || 1;
        return total * numberOfTravelers;
    }

    // Save order (called from StepContent)
    async function handleSaveOrder() {
        // implement as needed or pass as prop
    }

    // Download summary (called from StepContent)
    async function handleDownloadSummary() {
        // implement as needed or pass as prop
    }

    // Restart trip (called from StepContent)
    function handleRestartTrip() {
        setUserResponses({});
        setCurrentStep(0);
        setPaymentCompleted(false);
        localStorage.removeItem("userResponses");
        localStorage.setItem("currentStep", "0");
    }

    // MAIN RENDER
    return (
        <div className="containerCh">
            <header>
                <h1>Travel Planner</h1>
                <ProgressBar currentStep={currentStep} stepsLength={steps.length} />
            </header>
            <StepContent
                currentStep={currentStep}
                steps={steps}
                userResponses={userResponses}
                setUserResponses={setUserResponses}
                setCurrentStep={setCurrentStep}
                setIsPaymentModalOpen={setIsPaymentModalOpen}
                setPaymentCompleted={setPaymentCompleted}
                paymentCompleted={paymentCompleted}
                calculateTotalPrice={calculateTotalPrice}
                handleSaveOrder={handleSaveOrder}
                handleDownloadSummary={handleDownloadSummary}
                handleRestartTrip={handleRestartTrip}
                navigate={navigate}
            />
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onPaymentSuccess={async () => {
                    setPaymentCompleted(true);
                    setCurrentStep(prev => prev + 1);
                }}
                totalAmount={calculateTotalPrice()}
                userResponses={userResponses}
            />
        </div>
    );
}

export default TravelPlannerApp;
