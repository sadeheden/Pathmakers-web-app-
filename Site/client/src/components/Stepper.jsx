// components/Stepper.jsx
import React from "react";

export default function Stepper({ steps, currentStep }) {
  return (
    <ol className="wizard-steps" aria-label="Progress">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state =
          i < currentStep ? "done" : i === currentStep ? "active" : "todo";
        return (
          <li key={s.label} className={`wizard-step ${state}`}>
            <span className="wizard-icon">
              {Icon ? <Icon size={18} /> : <span className="dot" />}
            </span>
            <span className="wizard-label">{s.label}</span>
            {i !== steps.length - 1 && <span className="wizard-connector" />}
          </li>
        );
      })}
    </ol>
  );
}
