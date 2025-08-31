import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  calculateTotalPrice,
  downloadReceipt,
  getLastOrderId
} from "../utils/travelUtils.jsx";


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

  const handleDownloadReceipt = async () => {
    const id24 = getLastOrderId();
    if (!id24) {
      alert("No order found. Please create an order first or open it from your Personal Area.");
      return;
    }
    try {
      await downloadReceipt(id24);
    } catch (e) {
      // already alerted inside downloadReceipt
    }
  };

  const handleGoToPersonalArea = () => {
    // Ensure this path exists in your <Routes>. Change personalAreaPath if needed.
    navigate(personalAreaPath, { replace: true });
  };

  return (
    <div className="summary-box">
      {/* אייקון Download Receipt למעלה */}
     <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
  <button
    type="button"
    onClick={handleDownloadReceipt}
    aria-label="Download receipt"
    title="Download receipt"
    style={{
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '14px', // הגדלתי padding
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '26px', // הגדלתי גודל אייקון
      color: '#666',
      transition: 'all 0.2s ease',
      width: '50px',   // גודל אחיד
      height: '50px'
    }}
    onMouseEnter={(e) => {
      e.target.style.backgroundColor = '#f5f5f5';
      e.target.style.color = '#333';
    }}
    onMouseLeave={(e) => {
      e.target.style.backgroundColor = 'transparent';
      e.target.style.color = '#666';
    }}
  >
    📄
  </button>
</div>


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