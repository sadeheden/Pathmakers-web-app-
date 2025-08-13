import React from "react";
import { ChevronRight } from "lucide-react";

/* === Quick-select chips for budgets === */
function PriceChips({ options = [], value, onChange }) {
  return (
    <div className="price-chips">
      {options.map((opt) => {
        const v = Number(opt);
        const active = Number(value) === v;
        return (
          <button
            key={v}
            type="button"
            className={`price-chip ${active ? "active" : ""}`}
            onClick={() => onChange(v)}
          >
            ${v}
          </button>
        );
      })}
    </div>
  );
}

/* === Plus/minus counter for travelers === */
function CounterInput({ value = 1, min = 1, max = 20, step = 1, onChange }) {
  const v = Number.isFinite(Number(value)) ? Number(value) : min;
  const dec = () => onChange(Math.max(min, v - step));
  const inc = () => onChange(Math.min(max, v + step));
  return (
    <div className="counter">
      <button type="button" onClick={dec} aria-label="Decrease" disabled={v <= min}>−</button>
      <input
        type="number"
        value={v}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
      <button type="button" onClick={inc} aria-label="Increase" disabled={v >= max}>+</button>
    </div>
  );
}

const StepContent = ({
  step,
  userResponses,
  setUserResponses,
  currentStep,
  setCurrentStep,
  steps,
  paymentCompleted,
  setIsPaymentModalOpen,
  setPaymentCompleted,
}) => {
  if (!step || !Array.isArray(step.questions)) {
    return <div style={{ color: "red" }}>Error: Step misconfigured or not found.</div>;
  }

  return (
    <div className="step">
      <div className="step-header">
        {step.icon ? <step.icon /> : null}
        <h2>{step.label}</h2>
      </div>

      <div className="step-content">
        {step.questions.map((q, index) => {
          const val = userResponses[q.prompt];

          // === Special UIs ===
          if (q.prompt === "Budget range per night?" || q.prompt === "Budget for daily activities?") {
            const options = [50, 100, 150, 200];
            return (
              <div key={index}>
                <label>{q.prompt}</label>
                <PriceChips
                  options={options}
                  value={val}
                  onChange={(v) => setUserResponses((prev) => ({ ...prev, [q.prompt]: v }))}
                />
              </div>
            );
          }

          if (q.prompt === "Number of travelers") {
            return (
              <div key={index}>
                <label>{q.prompt}</label>
                <CounterInput
                  value={val ?? 1}
                  min={1}
                  max={20}
                  step={1}
                  onChange={(v) => setUserResponses((prev) => ({ ...prev, [q.prompt]: v }))}
                />
              </div>
            );
          }

          // === Default input/select logic (your original) ===
          return (
            <div key={index}>
              <label>{q.prompt}</label>

              {q.type === "text" || q.type === "date" || q.type === "number" ? (
                <>
                  {/* departure date */}
                  {q.prompt.includes("departure") && (
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={userResponses[q.prompt] || ""}
                      onChange={(e) =>
                        setUserResponses({ ...userResponses, [q.prompt]: e.target.value })
                      }
                    />
                  )}

                  {/* return date */}
                  {q.prompt.includes("return") && (
                    <input
                      type="date"
                      min={
                        userResponses["Travel dates (departure)?"] ||
                        new Date().toISOString().split("T")[0]
                      }
                      value={userResponses[q.prompt] || ""}
                      onChange={(e) =>
                        setUserResponses({ ...userResponses, [q.prompt]: e.target.value })
                      }
                      disabled={!userResponses["Travel dates (departure)?"]}
                    />
                  )}

                  {/* other text/number fields */}
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
                  value={
                    typeof userResponses[q.prompt] === "object"
                      ? userResponses[q.prompt]?.id
                      : userResponses[q.prompt] || ""
                  }
                  onChange={(e) => {
                    let selectedOption;
                    if (typeof q.options?.[0] === "string") {
                      selectedOption = e.target.value;
                    } else {
                      selectedOption = q.options?.find((opt) => opt.id === e.target.value);
                    }

                    setUserResponses((prev) => ({
                      ...prev,
                      [q.prompt]: selectedOption,
                    }));

                    // Payment modal trigger (unchanged behavior)
                    const methodsRequiringModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"];
                    if (q.prompt === "Select payment method") {
                      const chosen = selectedOption?.name || selectedOption;
                      if (methodsRequiringModal.includes(chosen)) {
                        setIsPaymentModalOpen(false);
                        setTimeout(() => setIsPaymentModalOpen(true), 10);
                        setPaymentCompleted(false);
                      } else {
                        setPaymentCompleted(true);
                      }
                    }
                  }}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  {q.options &&
                    q.options.length > 0 &&
                    q.options.map((option, i) => (
                      <option
                        key={i}
                        value={typeof option === "string" ? option : option.id}
                      >
                        {typeof option === "string" ? option : option.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
          );
        })}
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
            const cur = steps[currentStep];
            const isPaymentStep = cur.label === "Payment";
            const selectedMethod = userResponses["Select payment method"];
            const requiresModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"].includes(
              selectedMethod
            );

            if (isPaymentStep && requiresModal && !paymentCompleted) {
              setIsPaymentModalOpen(true);
              return;
            }
            setCurrentStep((prev) => prev + 1);
          }}
          disabled={
            currentStep === steps.length - 1 ||
            (
              steps[currentStep]?.label !== "Hotel" &&   /* don't block on Hotel step */
              steps[currentStep]?.questions?.length > 0 &&
              !userResponses[steps[currentStep].questions[0]?.prompt]
            ) ||
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
};

export default StepContent;
