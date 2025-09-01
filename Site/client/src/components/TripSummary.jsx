import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  calculateTotalPrice,
  downloadReceipt,
  getLastOrderId
} from "../utils/travelUtils.jsx";
import { FaFilePdf } from "react-icons/fa"; // ✅ אייקון PDF

const TripSummary = ({
  userResponses,
  setUserResponses,
  setCurrentStep,
  setPaymentCompleted,
  onRestart = () => {},
  personalAreaPath = "/personal-area",
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
    navigate(personalAreaPath, { replace: true });
  };

  return (
    <div className="summary-box">
      {/* כפתור הורדת קבלה */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button
          type="button"
          onClick={handleDownloadReceipt}
          aria-label="Download receipt"
          title="Download PDF receipt"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '14px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: '#d32f2f', // אדום כמו PDF
            transition: 'all 0.2s ease',
            width: '52px',
            height: '52px'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#fbeaea';
            e.target.style.color = '#b71c1c';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
            e.target.style.color = '#d32f2f';
          }}
        >
          <FaFilePdf />
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
  <button className="btn-lightblue" onClick={onRestart}>Start Over</button>
  <button className="btn-primary" onClick={() => navigate('/personal-area')}>Go to Personal Area</button>
</div>

    </div>
  );
};

export default TripSummary;
