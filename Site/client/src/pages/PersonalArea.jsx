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

// Replace the normalizeOrder function in your PersonalArea.jsx with this:
// convert many possible shapes into a real Date (or null)
const toDateObj = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v);
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d) ? null : d;
  }
  if (typeof v === "object") {
    // Mongo export styles
    if (v.$date) {
      const inner = v.$date;
      if (typeof inner === "string" || typeof inner === "number") {
        return new Date(Number(inner));
      }
      if (inner && typeof inner === "object" && inner.$numberLong) {
        return new Date(Number(inner.$numberLong));
      }
    }
    if (v.$numberLong) {
      return new Date(Number(v.$numberLong));
    }
  }
  return null;
};
// Robust date parser for many Mongo/JS shapes → { ts:number|null, iso:string|null }
const parseAnyDate = (v) => {
  const toISO = (d) => (Number.isNaN(+d) ? null : d.toISOString());
  const toTS  = (d) => (Number.isNaN(+d) ? null : d.getTime());

  if (!v) return { ts: null, iso: null };

  // plain Date
  if (v instanceof Date) return { ts: v.getTime(), iso: v.toISOString() };

  // number (ms)
  if (typeof v === "number") {
    const d = new Date(v);
    return { ts: toTS(d), iso: toISO(d) };
  }

  // string (ISO or millis)
  if (typeof v === "string") {
    const isDigits = /^\d+$/.test(v.trim());
    const d = isDigits ? new Date(Number(v)) : new Date(v);
    return { ts: toTS(d), iso: toISO(d) };
  }

  // Mongo export shapes
  if (typeof v === "object") {
    // {"$date": "..."} OR {"$date":{"$numberLong":"..."}}
    if (v.$date !== undefined) {
      const inner = v.$date;
      if (typeof inner === "string") {
        const isDigits = /^\d+$/.test(inner.trim());
        const d = isDigits ? new Date(Number(inner)) : new Date(inner);
        return { ts: toTS(d), iso: toISO(d) };
      }
      if (inner && typeof inner === "object" && inner.$numberLong) {
        const d = new Date(Number(inner.$numberLong));
        return { ts: toTS(d), iso: toISO(d) };
      }
    }
    // {"$numberLong":"..."}
    if (v.$numberLong) {
      const d = new Date(Number(v.$numberLong));
      return { ts: toTS(d), iso: toISO(d) };
    }
  }

  return { ts: null, iso: null };
};


const normalizeOrder = (o) => {
  // id (handles ObjectId, {$oid}, strings)
  const id = (() => {
    const raw = o?._id ?? o?.id ?? null;
    if (!raw) return null;
    if (typeof raw === "object") {
      if (raw.$oid) return raw.$oid;
      try { return String(raw); } catch { return null; }
    }
    return String(raw);
  })();

  const departure =
    o.departureCityName || o.departure_city_name || o.departure || o.departure_city_id || "—";

const destination =
  o.destinationCityName ??
  o.destination_city_name ??
  (typeof o.destination === "string" ? o.destination : null) ??
  // if you *really* want a last resort, try to resolve the id to a name,
  // but do NOT show raw ids or unrelated fields like `cityName`
  null;


  const flight = o.flightName || o.flight_name || o.flightNumber || "—";

 const hotel =
  o.hotelName ??
  o.hotel_name ??
  (typeof o.hotel_id === "string" ? o.hotel_id : "—");

  const attractions =
    (Array.isArray(o.attraction_names) && o.attraction_names) ||
    (Array.isArray(o.attractionNames) && o.attractionNames) ||
    (Array.isArray(o.attractions) && o.attractions) ||
    [];

  // robust date handling
 const createdRaw = o.created_at ?? o.createdAt ?? o.bookingDate ?? o.tripDate ?? null;
  let { ts: createdAtTs, iso: createdAtISO } = parseAnyDate(createdRaw);

  // ⬇️ NEW: fallback from ObjectId timestamp
  if (!Number.isFinite(createdAtTs)) {
    const idForTs =
      (typeof o?._id === "object" && o?._id?.$oid) ? o._id.$oid :
      (typeof o?._id === "string") ? o._id :
      (typeof o?.id === "string") ? o.id :
      null;

    const oidTs = tsFromObjectId(idForTs);
    if (Number.isFinite(oidTs)) {
      createdAtTs = oidTs;
      try { createdAtISO = new Date(oidTs).toISOString(); } catch {}
    }
  }

  const totalPrice = Number(o.total_price ?? o.totalPrice ?? 0);

  return {
    raw: o,
    id,
    departure,
    destination,
    flight,
    hotel,
    attractions,
    transportation: o.transportation || "—",
    paymentMethod: o.payment_method || o.paymentMethod || "—",
    totalPrice,
    createdAt: createdAtISO ?? null,
    createdAtTs: Number.isFinite(createdAtTs) ? createdAtTs : null,
    source: o.cityName ? "orders2" : "order",
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

  // Fetch from both endpoints
  const [orders1, orders2] = await Promise.allSettled([
    tryFetch(`${API_BASE}/api/order?limit=100`).catch(() => []),
    tryFetch(`${API_BASE}/api/orders2?limit=100`).catch(() => [])
  ]);

  // Combine results
  const allOrders = [
    ...(orders1.status === 'fulfilled' ? orders1.value : []),
    ...(orders2.status === 'fulfilled' ? orders2.value : [])
  ];

  console.log("🔍 Fetched orders:", {
    fromOrder: orders1.status === 'fulfilled' ? orders1.value.length : 0,
    fromOrders2: orders2.status === 'fulfilled' ? orders2.value.length : 0,
    total: allOrders.length
  });

  return allOrders;
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
      
<style >{`
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
      
      <style >{`
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
      
      <style>{`
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

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");

    if (!token) {
      navigate("/login");
      return null;
    }

    const res = await fetch(`${API_BASE}/api/auth/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed user fetch ${res.status}`);

    const userData = await res.json();
    // ✅ fixed: spread the fetched user object correctly
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

    // normalize
    const normalized = rawOrders.map(normalizeOrder);

    // dedupe by a composite key
    const makeKey = (o) =>
      `${o.source || "order"}:${o.id || o.raw?.orderNumber || o.createdAt || Math.random()}`;

    const map = new Map();
    for (const o of normalized) {
      const k = makeKey(o);
      if (!map.has(k)) map.set(k, o);
    }
    const deduped = Array.from(map.values());

    setOrders(deduped);
  } catch (e) {
    console.error("orders fetch error", e);
    setApiError("Failed to load your orders.");
    setOrders([]);
  } finally {
    setIsOrdersLoading(false);
  }
};


// inside PersonalArea.jsx > when selectedOrder opens:
// ✅ keep as-is, or drop the onlyIds check if you want to always resolve
useEffect(() => {
  if (!selectedOrder) return;
  const ids = Array.isArray(selectedOrder.attractions) ? selectedOrder.attractions : [];
  const onlyIds = ids.length > 0 && ids.every(v => /^[0-9a-fA-F]{24}$/.test(v));
  if (!onlyIds) return;

  let cancelled = false;
  (async () => {
    try {
      const token = localStorage.getItem("authToken");
      const q = ids.join(",");
      const r = await fetch(`${API_BASE}/api/attractions?ids=${encodeURIComponent(q)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const { data = [] } = await r.json();
      const names = data.map(a => a.name).filter(Boolean);
      if (!cancelled) {
        setSelectedOrder(prev => ({ ...prev, attractionNamesResolved: names }));
      }
    } catch {}
  })();
  return () => { cancelled = true; };
}, [selectedOrder]);

// and in the render, prefer selectedOrder.attractionNamesResolved || raw.attraction_names || …

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

  // date range bounds in local time (inclusive)
  const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
  const toTime   = dateTo   ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

  if (fromTime !== null || toTime !== null) {
    list = list.filter((o) => {
      const t = typeof o.createdAtTs === "number" ? o.createdAtTs : null;
      if (t === null) return false;
      if (fromTime !== null && t < fromTime) return false;
      if (toTime   !== null && t > toTime)   return false;
      return true;
    });
  }

 list.sort((a, b) => {
  const hasA = Number.isFinite(a.createdAtTs);
  const hasB = Number.isFinite(b.createdAtTs);

  // always put items without a date at the end
  if (hasA && !hasB) return -1;
  if (!hasA && hasB) return 1;
  if (!hasA && !hasB) return 0;

  return sortDir === "asc"
    ? a.createdAtTs - b.createdAtTs
    : b.createdAtTs - a.createdAtTs;
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
                  <p>no user data available</p>
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
    const rawNames = selectedOrder?.raw?.attraction_names;
    const resolved = selectedOrder?.attractionNamesResolved;
    const attrs = Array.isArray(selectedOrder?.attractions) ? selectedOrder.attractions : [];

    const ID_RE = /^[0-9a-fA-F]{24}$/;
    const onlyIds = attrs.length > 0 && attrs.every(v => typeof v === "string" && ID_RE.test(v));

    // 👇 priority: resolved names from useEffect → names saved on the order → non-ID strings in attractions
    const names =
      (Array.isArray(resolved) && resolved.length ? resolved : null) ??
      (Array.isArray(rawNames) && rawNames.length ? rawNames : null) ??
      (attrs.length && !onlyIds ? attrs : []);

    // Loading state while resolving IDs to names
    if (!names.length && onlyIds) {
      return <span className="chip chip--muted">Resolving {attrs.length}…</span>;
    }

    if (names.length) {
      return (
        <span className="chip-list">
          {names.map((n, i) => (
            <span key={i} className="chip">{n}</span>
          ))}
        </span>
      );
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
                {currentPageOrders.map((o, index) => (
                  <li
                    key={`${o.source || 'order'}:${o.id || o.raw?.orderNumber || o.createdAt || index}`}
                    className="order-card">
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