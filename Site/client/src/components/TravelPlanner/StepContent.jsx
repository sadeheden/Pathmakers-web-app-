// /components/TravelPlanner/StepContent.jsx
import React from "react";
import { ChevronRight } from "lucide-react";
import { cleanId } from "./helpers";

function StepContent({
  currentStep,
  steps,
  userResponses,
  setUserResponses,
  setCurrentStep,
  setIsPaymentModalOpen,
  setPaymentCompleted,
  paymentCompleted,
  calculateTotalPrice,
  handleSaveOrder,
  handleDownloadSummary,
  handleRestartTrip,
  navigate
}) {
  const step = steps[currentStep];

  if (!step || !Array.isArray(step.questions)) {
    return <div style={{ color: "red" }}>Error: Step misconfigured or not found.</div>;
  }

  if (step.label === "Trip Summary") {
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

  // Step form
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
                    selectedOption = q.options.find(opt => opt.id === e.target.value);
                  }
                  setUserResponses((prevResponses) => ({
                    ...prevResponses,
                    [q.prompt]: selectedOption,
                  }));

                  const methodsRequiringModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"];
                  if (q.prompt === "Select payment method") {
                    if (methodsRequiringModal.includes(selectedOption?.name || selectedOption)) {
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
}

export default StepContent;
