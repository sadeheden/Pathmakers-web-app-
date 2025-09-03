import React, { useState } from "react";

const PaymentModal = ({
  isOpen,
  onClose,
  totalAmount = 0,
  onPaymentSuccess,
  userResponses,
  busy = false,
}) => {
  const [fullName, setFullName] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [error, setError] = useState("");

  const method = userResponses?.["Select payment method"];
  const isBank = method === "Bank Transfer";

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const maxYear = currentYear + 10;

  const picked = userResponses?.["Select attractions to visit"];
  const attractionIds = Array.isArray(picked)
    ? picked
        .map((a) => a?._id || a?.id || (typeof a === "string" ? a : null))
        .filter(Boolean)
    : [];
  const attractionNames = Array.isArray(picked)
    ? picked.map((a) => (typeof a === "string" ? a : a?.name)).filter(Boolean)
    : [];

  const pretty = `$${Number(totalAmount || 0).toFixed(2)}`;

  const handlePayment = () => {
    if (busy) return;

    const errs = [];
    const name = fullName.trim();

    if (!name || name.length < 3) {
      errs.push("❌ Invalid Full Name. Enter at least 3 characters.");
    } else if (name.split(/\s+/).length < 2) {
      errs.push("❌ Full Name must contain at least two words (first and last).");
    }

    if (!isBank) {
      if (!/^\d{16}$/.test(paymentDetails)) {
        errs.push("❌ Invalid Payment Number. Must be 16 digits.");
      }

      const expiryMatch = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
      if (!expiryMatch) {
        errs.push("❌ Invalid Expiry Date. Must be MM/YYYY.");
      } else {
        const month = parseInt(expiryMatch[1], 10);
        const year = parseInt(expiryMatch[2], 10);
        if (
          year < currentYear ||
          year > maxYear ||
          (year === currentYear && month < currentMonth)
        ) {
          errs.push(`❌ Expiry Date must be between current month and ${maxYear}.`);
        }
      }

      if (!/^\d{3}$/.test(cvv)) {
        errs.push("❌ Invalid CVV. Must be exactly 3 digits.");
      }
    }

    if (errs.length) {
      setError(errs.join("\n"));
      return;
    }

    setError("");
    onPaymentSuccess?.({ attractionIds, attractionNames });
  };

  if (!isOpen) return null;

  const disableAll = busy;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content payment">
        {/* Header */}
        <div className="modal-headline">
          <h2>Payment</h2>
          <div className="total-pill">
            Total: <strong>{pretty}</strong>
          </div>
        </div>

        {error && (
          <p className="error-message" style={{ whiteSpace: "pre-line" }}>
            {error}
          </p>
        )}

        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handlePayment();
          }}
        >
          <label>Full Name</label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={disableAll}
          />

          {!isBank && (
            <>
              <label>Payment Number</label>
              <input
                type="text"
                placeholder="1234 5678 9012 3456"
                maxLength="16"
                value={paymentDetails}
                onChange={(e) =>
                  setPaymentDetails(e.target.value.replace(/\D/g, ""))
                }
                disabled={disableAll}
              />

              <div className="field-row">
                <div>
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YYYY"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    disabled={disableAll}
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
                    disabled={disableAll}
                  />
                </div>
              </div>
            </>
          )}

          <button className="pay-button" type="submit" disabled={disableAll}>
            {disableAll ? "Processing…" : `Pay ${pretty}`}
          </button>

          <button
            type="button"
            className="change-payment"
            onClick={onClose}
            disabled={disableAll}
          >
            Change payment method
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
