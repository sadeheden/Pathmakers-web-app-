import React from "react";

const ProgressBar = ({ currentStep, stepsLength }) => (
    <div className="progress-bar">
        <div className="progress-bar-fill"
            style={{ width: `${((currentStep + 1) / stepsLength) * 100}%` }}></div>
    </div>
);

export default ProgressBar;
