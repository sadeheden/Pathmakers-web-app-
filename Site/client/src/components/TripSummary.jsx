import React from "react";
import { useNavigate } from "react-router-dom";
import { calculateTotalPrice } from "../utils/travelUtils.jsx";

const TripSummary = ({
  userResponses,
  setUserResponses,
  setCurrentStep,
  setPaymentCompleted,
  onRestart = () => {},        // default so it never crashes if not passed
  personalAreaPath = "/personal-area", // change if your route is different
}) => {
  const navigate = useNavigate();

  const get = (key) => userResponses?.[key];
  const dep = get("What is your departure city?");
  const dst = get("What is your destination city?");
  const flight = get("Select your flight");
  const hotel = get("Select your hotel");
  const attractions = get("Select attractions to visit");
  const transport = get("Select your mode of transportation");
  const payMethod = get("Select payment method");
  const total = calculateTotalPrice(userResponses);

  const textOrName = (v) => (typeof v === "string" ? v : v?.name);

 // TripSummary.jsx
const handleDownloadReceipt = async () => {
  const orderId = sessionStorage.getItem("lastOrderId");
  if (!orderId) {
    alert("No order id found. Please create an order first.");
    return;
  }

  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  try {
    const resp = await fetch(`/api/order/${orderId}/receipt.pdf`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fileSlug = (textOrName(dst) || "trip").toString().toLowerCase().replace(/\s+/g, "-");
    a.href = url;
    a.download = `receipt-${fileSlug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    console.error("Receipt download failed:", e);
    alert("Could not download the PDF receipt. Please try again.");
  }
};


  const handleGoToPersonalArea = () => {
    // Ensure this path exists in your <Routes>. Change personalAreaPath if needed.
    navigate(personalAreaPath, { replace: true });
  };

  return (
    <div className="summary-box">
      <div className="summary-details">
        <h3>Your Trip Summary</h3>
        <p><strong>From:</strong> {textOrName(dep) || "—"}</p>
        <p><strong>To:</strong> {textOrName(dst) || "—"}</p>
        <p><strong>Flight:</strong> {textOrName(flight) || "—"}</p>
        <p><strong>Hotel:</strong> {textOrName(hotel) || "—"}</p>
        <p>
          <strong>Attractions:</strong>{" "}
          {Array.isArray(attractions)
            ? attractions.map((a) => textOrName(a) || a).join(", ")
            : textOrName(attractions) || "—"}
        </p>
        <p><strong>Transportation:</strong> {transport || "—"}</p>
        <p><strong>Payment:</strong> {payMethod || "—"}</p>
        <p><strong>Total:</strong> ${total}</p>
      </div>

      <div className="summary-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGoToPersonalArea}
          aria-label="Go to Personal Area"
        >
          Go to Personal Area
        </button>

        <button
          type="button"
          className="btn btn-light"
          onClick={handleDownloadReceipt}
          aria-label="Download receipt"
        >
          Download Receipt
        </button>

        <button
          type="button"
          className="btn btn-outline danger"
          onClick={onRestart}
          title="Clear answers and go back to step 1"
          aria-label="Start over"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

export default TripSummary;
