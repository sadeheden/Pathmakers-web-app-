// src/pages/PersonalArea.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/PersonalArea.css";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace(/\/$/, "")) ||
  "http://localhost:4000";

/* ---------- helpers ---------- */
const looksLikeId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);
const toUsd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0)
  );

const normalizeOrder = (o) => {
  const departure =
    o.departureCityName ||
    o.departure_city_name ||
    o.departure ||
    o.departure_city_id ||
    "—";

  const destination =
    o.destinationCityName ||
    o.destination_city_name ||
    o.destination ||
    o.cityName ||
    o.destination_city_id ||
    "—";

  const flight = o.flightName || o.flight_name || o.flightNumber || "—";
  const hotel =
    o.hotelName ||
    o.hotel_name ||
    (o.cityName ? `${o.cityName} Hotel` : null) ||
    o.hotel_id ||
    "—";

  const attractions =
    (Array.isArray(o.attraction_names) && o.attraction_names) ||
    (Array.isArray(o.attractionNames) && o.attractionNames) ||
    (Array.isArray(o.attractions) && o.attractions) ||
    [];

  return {
    raw: o,
    id: o._id || o.id,
    departure,
    destination,
    flight,
    hotel,
    attractions,
    transportation: o.transportation || "—",
    paymentMethod: o.payment_method || o.paymentMethod || "—",
    totalPrice: Number(o.total_price ?? o.totalPrice ?? 0),
    createdAt: o.createdAt || o.bookingDate || o.created_at || null,
  };
};

async function fetchMyOrders(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const tryFetch = async (url) => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(String(r.status));
    const j = await r.json();
    return (
      j?.data?.orders ||
      j?.orders ||
      (Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [])
    );
  };

  try {
    return await tryFetch(`${API_BASE}/api/orders2?limit=100`);
  } catch {
    return await tryFetch(`${API_BASE}/api/order?limit=100`);
  }
}

// Beautiful Loading Component
const LoadingSpinner = ({ size = "large", message = "טוען..." }) => {
  const spinnerSize = size === "small" ? "40px" : size === "medium" ? "60px" : "80px";
  
  return (
    <div 
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        minHeight: size === "large" ? "300px" : "150px",
      }}
    >
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: "4px solid #f3f4f6",
          borderTop: "4px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginBottom: "16px"
        }}
      />
      <p style={{
        color: "#6b7280",
        fontSize: "16px",
        fontWeight: "500",
        margin: 0,
        textAlign: "center"
      }}>
        {message}
      </p>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Page Loading Overlay Component
const PageLoadingOverlay = ({ message = "טוען נתונים..." }) => {
  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.3s ease-out"
      }}
    >
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "40px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        textAlign: "center",
        maxWidth: "300px",
        width: "90%"
      }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            border: "4px solid #f3f4f6",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}
        />
        <p style={{
          color: "#374151",
          fontSize: "18px",
          fontWeight: "500",
          margin: 0
        }}>
          {message}
        </p>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Success Popup Component
const SuccessPopup = ({ isVisible, onClose, message }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="success-popup-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.3s ease-out"
      }}
    >
      <div 
        className="success-popup-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          textAlign: "center",
          position: "relative",
          animation: "slideUp 0.3s ease-out"
        }}
      >
        {/* Success Icon */}
        <div style={{
          width: "64px",
          height: "64px",
          backgroundColor: "#10b981",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          animation: "scaleIn 0.4s ease-out 0.1s both"
        }}>
          <svg 
            width="32" 
            height="32" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="white" 
            strokeWidth="3"
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
        </div>
        
        {/* Title */}
        <h3 style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "#111827",
          margin: "0 0 12px",
          animation: "slideUp 0.4s ease-out 0.2s both"
        }}>
            Success! 🎉
        </h3>
        
        {/* Message */}
        <p style={{
          fontSize: "16px",
          color: "#6b7280",
          margin: "0 0 24px",
          lineHeight: "1.5",
          animation: "slideUp 0.4s ease-out 0.3s both"
        }}>
          {message}
        </p>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: "pointer",
            transition: "all 0.2s ease",
            animation: "slideUp 0.4s ease-out 0.4s both"
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#059669";
            e.target.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "#10b981";
            e.target.style.transform = "translateY(0)";
          }}
        >
          סגור
        </button>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.5);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

const PersonalArea = () => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("userInfo");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  const [orders, setOrders] = useState([]); // normalized orders
  const [apiError, setApiError] = useState("");

  // date filter + sort
  const [dateFrom, setDateFrom] = useState(""); // "YYYY-MM-DD"
  const [dateTo, setDateTo] = useState("");     // "YYYY-MM-DD"
  const [sortDir, setSortDir] = useState("desc"); // "desc" | "asc"

  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ username: "", email: "" });

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /* ---------- user fetch ---------- */
  const fetchUser = async () => {
    try {
      setIsUserLoading(true);
      const token = localStorage.getItem("authToken");
      if (!token) {
        navigate("/login");
        return null;
      }
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed user fetch ${res.status}`);
      const userData = await res.json();
      const formatted = { ...userData, id: userData._id };
      setUser(formatted);
      setEditedUser({
        username: userData.username || "",
        email: userData.email || "",
      });
      return formatted;
    } catch (e) {
      console.error("user fetch error", e);
      return null;
    } finally {
      setIsUserLoading(false);
    }
  };

  /* ---------- orders fetch ---------- */
  const loadOrders = async () => {
    try {
      setIsOrdersLoading(true);
      setApiError("");
      const token = localStorage.getItem("authToken");
      if (!token) return;
      const rawOrders = await fetchMyOrders(token);

      const normalized = rawOrders.map(normalizeOrder);
      setOrders(normalized);
    } catch (e) {
      console.error("orders fetch error", e);
      setApiError("Failed to load your orders.");
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  /* ---------- init ---------- */
  useEffect(() => {
    (async () => {
      setIsInitialLoading(true);
      const u = await fetchUser();
      if (u?.id) {
        await loadOrders();
      }
      setIsInitialLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- memo: date filter + sort ---------- */
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // filter by date range if provided
    const fromTime = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;

    if (fromTime || toTime) {
      list = list.filter((o) => {
        if (!o.createdAt) return false;
        const t = new Date(o.createdAt).getTime();
        if (Number.isNaN(t)) return false;
        if (fromTime && t < fromTime) return false;
        if (toTime && t > toTime) return false;
        return true;
      });
    }

    // sort by createdAt
    list.sort((a, b) => {
      const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDir === "asc" ? dA - dB : dB - dA;
    });

    return list;
  }, [orders, dateFrom, dateTo, sortDir]);

  const [page, setPage] = useState(1);
  const pageSize = 9;

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(filteredOrders.length / pageSize)),
    [filteredOrders.length]
  );

  const currentPageOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, sortDir, orders.length]);

  /* ---------- actions ---------- */
  const handleViewOrderDetails = (order) => setSelectedOrder(order);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
    navigate("/login");
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);
  };

  const handleSubscribe = async () => {
    if (!email.trim()) {
      alert("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Newsletter endpoint not found on the server. Add /api/newsletter route.");
        }
        if (res.status === 409) {
          showSuccessMessage("You are already subscribed to the newsletter with this email! ✅");
          setEmail("");
          return;
        }
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `HTTP ${res.status}`);
      }

      showSuccessMessage("Successfully subscribed to the newsletter! 📧 Check your inbox.");
      setEmail("");
    } catch (e) {
      alert(`Failed to subscribe: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSortDir("desc");
  };

  // Show initial loading overlay
  if (isInitialLoading) {
    return <PageLoadingOverlay message="Loading your Profile.." />;
  }

  /* ---------- UI ---------- */
  return (
    <div>
      <h1 className="page-title">Personal Area</h1>

      <div className="tab-buttons">
        <button
          data-tab="userInfo"
          onClick={() => setActiveTab("userInfo")}
          className={activeTab === "userInfo" ? "active" : ""}
        >
          User Info
        </button>

        <button
          data-tab="orders"
          onClick={() => setActiveTab("orders")}
          className={activeTab === "orders" ? "active" : ""}
        >
          Previous Orders
        </button>

        <button
          data-tab="newsletter"
          onClick={() => setActiveTab("newsletter")}
          className={activeTab === "newsletter" ? "active" : ""}
        >
          Sign Up for Newsletter
        </button>
      </div>

      <div className="containerPersonal">
        {/* User Information */}
        {activeTab === "userInfo" && (
          <>
            <h2 className="heading">User Details</h2>
            <div className="profileInfo">
              {isUserLoading ? (
                <LoadingSpinner size="medium" message="טוען פרטי משתמש..." />
              ) : user ? (
                <>
                  <p>
                    <strong>Username:</strong> {user.username}
                  </p>
                  <p>
                    <strong>Email:</strong> {user.email}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <button className="view-details-button" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <p>לא ניתן לטעון את פרטי המשתמש</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Order Details Modal */}
        {selectedOrder && (
          <div
            className="order-modal"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="order-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">Order Details</div>
              <button className="close-modal" onClick={() => setSelectedOrder(null)} aria-label="Close">×</button>

              <div className="modal-body">
                {/* Wrap details in a grid for nicer layout */}
                <div className="order-detail-grid">
                  <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Created At:</strong> {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "—"}</p>
                  <p><strong>Departure City:</strong> {selectedOrder.departure}</p>
                  <p><strong>Destination City:</strong> {selectedOrder.destination}</p>
                  <p><strong>Flight:</strong> {selectedOrder.flight}</p>
                  <p><strong>Hotel:</strong> {selectedOrder.hotel}</p>

                  {/* Attractions (chips) */}
                  <p style={{ gridColumn: "1 / -1" }}>
                    <strong>Attractions:</strong>{" "}
                    {(() => {
                      const names =
                        selectedOrder?.raw?.attraction_names?.length
                          ? selectedOrder.raw.attraction_names
                          : (Array.isArray(selectedOrder.attractions) &&
                              !selectedOrder.attractions.every(v => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v))
                              ? selectedOrder.attractions
                              : []);

                      const ids = Array.isArray(selectedOrder.attractions) ? selectedOrder.attractions : [];
                      const onlyIds = ids.length > 0 && ids.every(v => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v));

                      if (names.length) {
                        return (
                          <span className="chip-list">
                            {names.map((n, i) => <span key={i} className="chip">{n}</span>)}
                          </span>
                        );
                      }

                      if (onlyIds) {
                        return <span className="chip chip--muted">{ids.length} selected</span>;
                      }

                      return "—";
                    })()}
                  </p>

                  <p><strong>Transportation:</strong> {selectedOrder.transportation}</p>
                  <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                  <p style={{ gridColumn: "1 / -1" }}>
                    <strong>Total Price:</strong> {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(selectedOrder.totalPrice ?? 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {activeTab === "orders" && (
          <>
            <h2 className="heading">Your Previous Orders</h2>

            {apiError && (
              <div style={{ color: "crimson", marginBottom: 12 }}>{apiError}</div>
            )}

            {isOrdersLoading ? (
              <LoadingSpinner size="large" message="טוען הזמנות קודמות..." />
            ) : (
              <>
                {/* Compact date + sort filters */}
                <div
                  className="orders-filters"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 8,
                    alignItems: "end",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      From
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      To
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#666" }}>
                      Sort
                    </label>
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                    >
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={clearFilters}
                      className="view-details-button"
                      style={{ width: "100%" }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <small style={{ color: "#666", display: "block", marginBottom: 8 }}>
                  Showing: {filteredOrders.length} of {orders.length}
                </small>

                {filteredOrders.length > 0 ? (
                  <>
                    <ul className="orders-grid">
                      {currentPageOrders.map((o) => (
                        <li key={o.id} className="order-card">
                          <div className="top">
                            <div className="route">
                              <strong>{o.departure} → {o.destination}</strong>
                            </div>
                            <div className="price">{toUsd(o.totalPrice)}</div>
                          </div>

                          <div className="meta">
                            <div><span className="lbl">Date</span>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</div>
                            <div><span className="lbl">Payment</span>{o.paymentMethod || "—"}</div>
                            <div><span className="lbl">Flight</span>{o.flight}</div>
                            <div><span className="lbl">Hotel</span>{o.hotel}</div>
                          </div>

                          <button className="view-details-button" onClick={() => handleViewOrderDetails(o)}>
                            View Details
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="pager">
                      <button
                        className="pager-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >‹ Prev</button>

                      <span className="pager-status">Page {page} / {pageCount}</span>

                      <button
                        className="pager-btn"
                        onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                        disabled={page === pageCount}
                      >Next ›</button>
                    </div>
                  </>
                ) : (
                  <div><p>No orders match the selected dates.</p></div>
                )}
              </>
            )}
          </>
        )}

        {/* Newsletter */}
        {activeTab === "newsletter" && (
          <>
            <h2 className="heading">Sign Up for Newsletter</h2>
            <div className="profileInfo">
              <p>Get the latest updates and travel deals straight to your inbox!</p>
            </div>
            <input
              type="email"
              placeholder="Enter your email"
              className="newsletter-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              onClick={handleSubscribe}
              className="newsletter-button"
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <div style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid transparent",
                    borderTop: "2px solid #ffffff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite"
                  }} />
                  loading...
                </span>
              ) : (
                "Subscribe"
              )}
            </button>
          </>
        )}
      </div>

      <button
        className="floating-support-btn"
        onClick={() => navigate("/support")}
        aria-label="Support"
      >
        ❔
      </button>

      {/* Success Popup */}
      <SuccessPopup 
        isVisible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
        message={successMessage}
      />
    </div>
  );
};

export default PersonalArea;