// /components/TravelPlanner/PaymentModal.jsx
import React, { useState } from "react";

const PaymentModal = ({
  isOpen,
  onClose,
  totalAmount,
  onPaymentSuccess,
  userResponses,
  setIsPaymentModalOpen,
  setPaymentCompleted
}) => {
  const [fullName, setFullName] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 10;

  const handlePayment = () => {
    let errors = [];

    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.push("❌ Invalid Full Name. Enter at least 3 characters.");
    }

    if (!/^\d{16}$/.test(paymentDetails)) {
      errors.push("❌ Invalid Payment Number. Must be 16 digits.");
    }

    const expiryMatch = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
    if (!expiryMatch || parseInt(expiryMatch[2]) < currentYear || parseInt(expiryMatch[2]) > maxYear) {
      errors.push(`❌ Invalid Expiry Date. Must be MM/YYYY between ${currentYear}-${maxYear}.`);
    }

    if (!/^\d{3}$/.test(cvv)) {
      errors.push("❌ Invalid CVV. Must be exactly 3 digits.");
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setPaymentSuccess(true);
    setError("");

    setTimeout(() => {
      setPaymentSuccess(false);
      setIsPaymentModalOpen(false);
      setPaymentCompleted(true);
      onPaymentSuccess();
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {paymentSuccess ? (
          <>
            <h2>🎉 Payment Successful! 🎉</h2>
            <p>Your payment of <strong>${totalAmount}</strong> has been processed.</p>
            <p>✅ Your trip is now confirmed!</p>
          </>
        ) : (
          <>
            <h2>{userResponses["Select payment method"]} Payment</h2>
            <p><strong>Total Amount: ${totalAmount}</strong></p>
            {error && <p className="error-message">{error}</p>}

            <label>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <label>Payment Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              maxLength="16"
              value={paymentDetails}
              onChange={(e) => setPaymentDetails(e.target.value.replace(/\D/g, ""))}
            />

            <div className="expiry-cvv">
              <div>
                <label>Expiry Date</label>
                <input
                  type="text"
                  placeholder="MM/YYYY"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div>
                <label>CVV</label>
                <input
                  type="text"
                  placeholder="123"
                  maxLength="3"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </div>

            <button className="pay-button" onClick={handlePayment} disabled={paymentSuccess}>
              {paymentSuccess ? "Processing..." : `Pay $${totalAmount}`}
            </button>
            <button className="change-payment" onClick={onClose}>Change payment method</button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;
