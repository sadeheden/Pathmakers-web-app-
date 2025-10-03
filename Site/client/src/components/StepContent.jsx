import React, { useEffect, useMemo, useRef, useState } from "react";
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

/* === Dropdown with checkboxes for multi-select (names only) === */
function MultiSelectCheckboxDropdown({
  options = [],
  value = [],
  onChange,
  placeholder = "Select...",
  valueKey = "id",
  labelKey = "name",
}) {
  const normalize = (o) => ({
    id: String(o?.[valueKey] ?? o?.id ?? o?.value ?? ""),
    name: String(o?.[labelKey] ?? o?.name ?? o?.label ?? o?.title ?? ""),
    ...o,
  });

  const normalizedOptions = React.useMemo(
    () => options.map(normalize).filter((o) => o.id && o.name),
    [options]
  );

  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const selectedIds = React.useMemo(
    () =>
      new Set(
        selected.map((x) =>
          typeof x === "object"
            ? String(x.id ?? x._id ?? x[valueKey] ?? x.value)
            : String(x)
        )
      ),
    [selected, valueKey]
  );

  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onClickAway = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const toggleId = (id) => {
    const nextIds = new Set(selectedIds);
    if (nextIds.has(id)) nextIds.delete(id);
    else nextIds.add(id);

    const next = normalizedOptions
      .filter((o) => nextIds.has(o.id))
      .map((o) => ({ id: o.id, name: o.name, ...o }));
    onChange(next);
  };

  const selectAll = () =>
    onChange(normalizedOptions.map((o) => ({ id: o.id, name: o.name, ...o })));

  const clearAll = () => onChange([]);

  const allSelectedLabels = normalizedOptions
    .filter((o) => selectedIds.has(o.id))
    .map((o) => o.name);

  const buttonText =
    allSelectedLabels.length === 0
      ? placeholder
      : allSelectedLabels.length <= 2
      ? allSelectedLabels.join(", ")
      : `${allSelectedLabels.slice(0, 2).join(", ")} +${
          allSelectedLabels.length - 2
        }`;

  return (
    <div ref={ref} className="mscd">
      <button
        type="button"
        className="mscd-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="mscd-trigger-text">{buttonText}</span>
        <svg
          className={`mscd-caret ${open ? "open" : ""}`}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-multiselectable="true" className="mscd-panel">
          <div className="mscd-actions">
            <button type="button" onClick={selectAll}>Select all</button>
            <button type="button" onClick={clearAll}>Clear</button>
          </div>

          <div className="mscd-list">
            {normalizedOptions.length === 0 ? (
              <div className="mscd-empty">No attractions</div>
            ) : (
              normalizedOptions.map((o) => {
                const checked = selectedIds.has(o.id);
                return (
                  <label key={o.id} className="mscd-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleId(o.id)}
                      className="mscd-check"
                    />
                    <span className="mscd-label">{o.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
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
  onFlightDateCheck,
}) => {
  if (!step || !Array.isArray(step.questions)) {
    return <div style={{ color: "red" }}>Error: Step misconfigured or not found.</div>;
  }

  const START_KEY = "Select trip start date";
  const END_KEY = "Select trip end date";
  const todayISO = new Date().toISOString().split("T")[0];

  const ensureArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  const toStr = (v) => (v == null ? "" : String(v));

  // required-fields gating
  const REQUIRED = {
    Destination: ["What is your departure city?", "What is your destination city?"],
    Flight: [START_KEY, END_KEY, "Select your flight"],
    Hotel: ["Select your hotel"],
    Payment: ["Select payment method"],
  };
  const hasValue = (v) =>
    typeof v === "object" ? Boolean(v?.id || v?.name) : Boolean(v);
  const isStepComplete = (curStep, responses) => {
    const req = REQUIRED[curStep.label] || [];
    return req.every((key) => hasValue(responses[key]));
  };

  // helpers for single selects (supports valueKey/labelKey)
  const normalizeOptFactory = (q) => {
    const vKey = q?.valueKey || "id";
    const lKey = q?.labelKey || "name";
    return {
      vKey,
      lKey,
      normalize: (o) => ({
        id: toStr(o?.[vKey] ?? o?.id ?? o?.value),
        name: toStr(o?.[lKey] ?? o?.name ?? o?.label ?? o?.title ?? ""),
        ...o,
      }),
    };
  };

  return (
    <div className="step">
      <div className="step-header">
        {step.icon ? <step.icon /> : null}
        <h2>{step.label}</h2>
      </div>

      <div className="step-content">
        {step.questions.map((q, index) => {
          const val = userResponses[q.prompt];

          // Quick chips
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

          // Counter
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

          // Multi-select for attractions (names only)
          if (q.prompt === "Select attractions to visit") {
            // Determine keys from q (supports valueKey/labelKey if provided)
            const vKey = q?.valueKey || "id";
            const lKey = q?.labelKey || "name";

            // Strip any price suffix if your options include it; here we prefer plain name fields.
            const cleanedOptions = (Array.isArray(q.options) ? q.options : []).map((o) => {
              const id = toStr(o?.[vKey] ?? o?.id ?? o?.value);
              // Prefer explicit name/label/title; do NOT show price
              const name =
                o?.[lKey] ??
                o?.name ??
                o?.label ??
                o?.title ??
                "";
              return { ...o, [vKey]: id, [lKey]: String(name) };
            });

            const selected = ensureArray(val);

            return (
              <div key={index}>
                <label>{q.prompt}</label>
                <MultiSelectCheckboxDropdown
                  options={cleanedOptions}
                  value={selected}
                  onChange={(next) =>
                    setUserResponses((prev) => ({ ...prev, [q.prompt]: next }))
                  }
                  placeholder="Pick attractions"
                  valueKey={vKey}
                  labelKey={lKey}
                />
              </div>
            );
          }

          // Inputs: text/number/date
          if (q.type === "text" || q.type === "date" || q.type === "number") {
            return (
              <div key={index}>
                <label>{q.prompt}</label>
                {q.type === "date" ? (
                  <input
                    type="date"
                    value={userResponses[q.prompt] || ""}
                    min={q.prompt === END_KEY ? (userResponses[START_KEY] || todayISO) : todayISO}
                    onChange={(e) =>
                      setUserResponses((prev) => ({ ...prev, [q.prompt]: e.target.value }))
                    }
                    disabled={q.prompt === END_KEY && !userResponses[START_KEY]}
                  />
                ) : (
                  <input
                    type={q.type}
                    value={userResponses[q.prompt] || ""}
                    onChange={(e) =>
                      setUserResponses((prev) => ({ ...prev, [q.prompt]: e.target.value }))
                    }
                  />
                )}
              </div>
            );
          }

          // Single-select (supports valueKey/labelKey or strings)
          const opts = Array.isArray(q.options) ? q.options : [];
          const { vKey, lKey, normalize } = normalizeOptFactory(q);

          const currentValue = (() => {
            if (typeof userResponses[q.prompt] === "object") {
              const obj = userResponses[q.prompt];
              return toStr(obj?.id ?? obj?.[vKey] ?? obj?.value ?? "");
            }
            return toStr(userResponses[q.prompt] || "");
          })();

          const optionValue = (o) => toStr(o?.[vKey] ?? o?.id ?? o?.value);
          const optionLabel = (o) => toStr(o?.[lKey] ?? o?.name ?? o?.label ?? o?.title ?? optionValue(o));

          return (
            <div key={index}>
              <label>{q.prompt}</label>
              <select
                value={currentValue}
                onChange={(e) => {
                  let selectedOption;
                  if (typeof opts?.[0] === "string") {
                    selectedOption = e.target.value;
                  } else {
                    const raw = opts.find((opt) => optionValue(opt) === e.target.value);
                    selectedOption = raw ? normalize(raw) : "";
                  }

                  setUserResponses((prev) => ({
                    ...prev,
                    [q.prompt]: selectedOption,
                  }));

                  // Payment modal behavior
                  const methodsRequiringModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"];
                  if (q.prompt === "Select payment method") {
                    const chosen = typeof selectedOption === "string"
                      ? selectedOption
                      : selectedOption?.name;
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
                {opts.map((option, i) =>
                  typeof option === "string" ? (
                    <option key={i} value={option}>
                      {option}
                    </option>
                  ) : (
                    <option key={i} value={optionValue(option)}>
                      {optionLabel(option)}
                    </option>
                  )
                )}
              </select>
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
            const isFlightStep = cur.label === "Flight";
            const selectedMethod = userResponses["Select payment method"];
            const chosenName =
              typeof selectedMethod === "string" ? selectedMethod : selectedMethod?.name;
            const requiresModal = ["Credit Card", "PayPal", "Bank Transfer", "Crypto"].includes(chosenName);
// Check for flight date conflicts before proceeding
if (isFlightStep && typeof onFlightDateCheck === "function") {
  onFlightDateCheck(() => {
    setCurrentStep((prev) => prev + 1);
  });
  return;
}
            if (isPaymentStep && requiresModal && !paymentCompleted) {
              setIsPaymentModalOpen(true);
              return;
            }
            setCurrentStep((prev) => prev + 1);
          }}
          className="custom-btn2"
          disabled={
            currentStep === steps.length - 1 ||
            !isStepComplete(steps[currentStep], userResponses) ||
            (steps[currentStep]?.label === "Payment" && !paymentCompleted)
          }
        >
          {currentStep === steps.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
};

export default StepContent;
