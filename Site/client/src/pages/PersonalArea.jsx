// src/pages/PersonalArea.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate,useLocation  } from "react-router-dom";
import "../assets/styles/PersonalArea.css";

const API_BASE =
  (import.meta?.env?.VITE_API_BASE && import.meta.env.VITE_API_BASE.replace(/\/$/, "")) ||
  "https://pathmakers-server-site.onrender.com";

/* ---------- Helper Functions ---------- */
const looksLikeId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

const toUsd = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Number(n ?? 0)
  );


// Convert many possible shapes into a real Date (or null)
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
  const toTS = (d) => (Number.isNaN(+d) ? null : d.getTime());

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

const toIdString = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    if (typeof v.$oid === "string") return v.$oid;
    if (typeof v._id === "string") return v._id;
    if (v._id && typeof v._id.$oid === "string") return v._id.$oid;
  }
  try { return String(v); } catch { return null; }
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

  // Friendly names for route
  const departure =
    (typeof o.departure === "string" && o.departure) ||
    o.departureCityName ||
    o.departure_city_name ||
    (typeof o.cityName === "string" && o.cityName) ||
    (looksLikeId(o?.departure_city_id) ? o.departure_city_id : null) ||
    "—";

  const destination =
    (typeof o.destination === "string" && o.destination) ||
    o.destinationCityName ||
    o.destination_city_name ||
    (typeof o.cityName === "string" && o.cityName) ||
    (looksLikeId(o?.destination_city_id) ? o.destination_city_id : null) ||
    "—";

  const flight =
    (typeof o.flightNumber === "string" && o.flightNumber) ||
    o.flightName ||
    o.flight_name ||
    "—";

  const hotel =
    o.hotelName ||
    o.hotel_name ||
    toIdString(o.hotel_id) ||
    "—";

  // Normalize attractions:
  const attractionNames =
    (Array.isArray(o.attraction_names) ? o.attraction_names : null) ??
    (Array.isArray(o.attractionNames) ? o.attractionNames : null) ??
    [];

  const attractionIdStrings = Array.isArray(o.attractions)
    ? o.attractions
        .map(toIdString)
        .filter(s => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s))
    : [];

  const attractions = attractionNames.length ? attractionNames : attractionIdStrings;

  // robust date handling
  const createdRaw =
    o.bookingDate ??
    o.booking_date ??
    o.created_at ??
    o.createdAt ??
    o.tripDate ??
    null;
  const tripStartRaw =
    o.trip_start_date ?? o.trip_date ?? o.tripDate ?? o.startDate ?? null;
  const tripEndRaw =
    o.trip_end_date ?? o.return_date ?? o.returnDate ?? o.endDate ?? null;
  const { ts: tripStartTs, iso: tripStartISO } = parseAnyDate(tripStartRaw);
  const { ts: tripEndTs, iso: tripEndISO } = parseAnyDate(tripEndRaw);
  let { ts: tmpTs, iso: tmpIso } = parseAnyDate(createdRaw);
  let createdAtTs = tmpTs;
  let createdAtISO = tmpIso;

  if (!Number.isFinite(createdAtTs)) {
    const idForTs =
      (typeof o?._id === "object" && o?._id?.$oid) ? o._id.$oid :
      (typeof o?._id === "string") ? o._id :
      (typeof o?.id === "string") ? o.id :
      null;

    const tsFromObjectId = (idStr) => {
      if (!idStr || typeof idStr !== "string" || idStr.length < 8) return null;
      const secs = parseInt(idStr.slice(0, 8), 16);
      return Number.isFinite(secs) ? secs * 1000 : null;
    };

    const ts = tsFromObjectId(idForTs);
    if (typeof ts === "number" && Number.isFinite(ts)) {
      createdAtTs = ts;
      createdAtISO = new Date(ts).toISOString();
    }
  }

  const totalPrice = Number(o.total_price ?? o.totalPrice ?? 0);

  // Check if order can be cancelled (trip hasn't started yet)
  const canCancel = tripStartTs ? tripStartTs > Date.now() : true;
  const isCancelled = o.status === "cancelled" || o.cancelled === true;

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
    tripStartISO: tripStartISO,
    tripEndISO: tripEndISO,
    tripStartTs: Number.isFinite(tripStartTs) ? tripStartTs : null,
    tripEndTs: Number.isFinite(tripEndTs) ? tripEndTs : null,
    source: o.cityName ? "orders2" : "order",
    canCancel,
    isCancelled,
    cancelledAt: o.cancelled_at ? new Date(o.cancelled_at).toISOString() : null,
  };
};

// Fetch orders from BOTH collections and return one combined array
async function fetchMyOrders(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const tryFetch = async (url, source) => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`${source} ${r.status}`);
    const j = await r.json();
    const arr =
      j?.data?.orders ||
      j?.orders ||
      (Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []);
    return Array.isArray(arr) ? arr : [];
  };

  // Fetch both in parallel
  const [orders1Res, orders2Res] = await Promise.allSettled([
    tryFetch(`${API_BASE}/api/order?limit=100`, "order"),
    tryFetch(`${API_BASE}/api/orders2?limit=100`, "orders2"),
  ]);

  const ordersFromOrder = orders1Res.status === "fulfilled" ? orders1Res.value : [];
  const ordersFromOrders2 = orders2Res.status === "fulfilled" ? orders2Res.value : [];

  // Helpers
  const getId = (o) =>
    (o && typeof o._id === "string" && o._id) ||
    (o && o._id && typeof o._id.$oid === "string" && o._id.$oid) ||
    (o && typeof o.id === "string" && o.id) ||
    null;

  // robust date handling for orders
  const toTs = (v) => {
    if (!v) return NaN;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : NaN;
  };

  const tsFromObjectId = (id) => {
    if (!id || typeof id !== "string" || id.length < 8) return NaN;
    const secs = parseInt(id.slice(0, 8), 16);
    return Number.isFinite(secs) ? secs * 1000 : NaN;
  };

  // returns a stable timestamp per order (ms since epoch)
  const getOrderCreatedTs = (o) => {
    // Prefer stored fields from your two backends
    const t =
      toTs(o?.bookingDate) ||
      toTs(o?.booking_date) ||
      toTs(o?.created_at) ||
      toTs(o?.createdAt) ||
      toTs(o?.tripDate);

    if (Number.isFinite(t)) return t;

    // FINAL fallback: derive from MongoDB ObjectId (stable, per-document)
    const id =
      (typeof o?._id === "string" && o._id) ||
      (o?._id?.$oid) ||
      (typeof o?.id === "string" && o.id) ||
      null;

    return tsFromObjectId(id) || 0;
  };

  // Build a map by _id; prefer enriched fields from /api/order when both exist
  const byId = new Map();

  // First ingest orders2 (acts as a fallback)
  for (const o of ordersFromOrders2) {
    const id = getId(o);
    if (!id) continue;
    byId.set(id, o);
  }

  // Then overlay the enriched /api/order results (these win)
  for (const o of ordersFromOrder) {
    const id = getId(o);
    if (!id) continue;

    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, o);
      continue;
    }
    const dedupe = (arr) => Array.from(new Set((arr || []).filter(Boolean).map(String)));

    // Merge: enriched fields take precedence; keep anything missing
    byId.set(id, {
      ...existing,
      ...o, // overwrite with enriched values
      flight_name: o.flight_name ?? o.flightName ?? existing.flight_name ?? existing.flightName ?? null,
      hotel_name: o.hotel_name ?? o.hotelName ?? existing.hotel_name ?? existing.hotelName ?? null,
      departure_city_name:
        o.departure_city_name ?? o.departureCityName ??
        existing.departure_city_name ?? existing.departureCityName ??
        o.departure ?? existing.departure ?? null,
      destination_city_name:
        o.destination_city_name ?? o.destinationCityName ??
        existing.destination_city_name ?? existing.destinationCityName ??
        o.destination ?? existing.destination ?? o.cityName ?? existing.cityName ?? null,
      attraction_names: dedupe(
        (Array.isArray(o.attraction_names) ? o.attraction_names : o.attractionNames) ||
        (Array.isArray(existing.attraction_names) ? existing.attraction_names : existing.attractionNames) ||
        []
      ),
    });
  }

  const merged = Array.from(byId.values());

  // Sort newest first (fallback to ObjectId timestamp if needed)
  merged.sort((a, b) => getOrderCreatedTs(b) - getOrderCreatedTs(a));

  console.log("🔍 Fetched orders:", {
    fromOrder: ordersFromOrder.length,
    fromOrders2: ordersFromOrders2.length,
    totalRaw: ordersFromOrder.length + ordersFromOrders2.length,
    totalAfterDedup: merged.length,
  });

  return merged;
}

/* ---------- Components ---------- */
const LoadingSpinner = ({ size = "large", message = "Loading..." }) => {
  const sizeClass = size === "small" ? "loading-spinner--small" : 
                   size === "medium" ? "loading-spinner--medium" : 
                   "loading-spinner--large";
  
  const containerClass = size === "large" ? "loading-container--large" : 
                        size === "medium" ? "loading-container--medium" : 
                        "loading-container";

  return (
    <div className={`loading-container ${containerClass}`}>
      <div className={`loading-spinner ${sizeClass}`} />
      <p className="loading-message">{message}</p>
    </div>
  );
};

const PageLoadingOverlay = ({ message = "Loading data..." }) => {
  return (
    <div className="page-loading-overlay">
      <div className="page-loading-content">
        <div className="page-loading-spinner" />
        <p className="page-loading-message">{message}</p>
      </div>
    </div>
  );
};

const SuccessPopup = ({ isVisible, onClose, message }) => {
  if (!isVisible) return null;

  return (
    <div className="success-popup-overlay" onClick={onClose}>
      <div className="success-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="success-icon">
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
        
        <h3 className="success-title">Success!</h3>
        
        <p className="success-message">{message}</p>
        
        <button className="success-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

const CancelConfirmationPopup = ({ isVisible, onClose, onConfirm, orderDetails, isLoading }) => {
  if (!isVisible) return null;

  return (
    <div className="cancel-popup-overlay" onClick={onClose}>
      <div className="cancel-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="cancel-icon">
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
            <path d="M3 6h18l-2 13H5L3 6z"></path>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </div>
        
        <h3 className="cancel-title">Cancel Order?</h3>
        
        {orderDetails && (
          <div className="cancel-order-details">
            <p><strong>Route:</strong> {orderDetails.departure} → {orderDetails.destination}</p>
            <p><strong>Price:</strong> {toUsd(orderDetails.totalPrice)}</p>
            <p><strong>Trip Date:</strong> {orderDetails.tripStartTs ? new Date(orderDetails.tripStartTs).toLocaleDateString() : "—"}</p>
          </div>
        )}
        
        <p className="cancel-message">
          Are you sure you want to cancel this order?
        </p>
        
        <p className="cancel-submessage">
          The money will be refunded to you within a few days. If you need assistance, you can contact us.
        </p>
        
        <div className="cancel-actions">
          <button
            className={`cancel-keep-btn ${isLoading ? 'cancel-keep-btn:disabled' : ''}`}
            onClick={onClose}
            disabled={isLoading}
          >
            Keep Order
          </button>
          
          <button
            className={`cancel-confirm-btn ${isLoading ? 'cancel-confirm-btn:disabled' : ''}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="cancel-loading-spinner" />
                Cancelling...
              </>
            ) : (
              "Cancel Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
const isManagerMay = (user) => {
  if (!user) return false;
  const username = user.username?.toLowerCase();
  const email = user.email?.toLowerCase();
  
  return username === "managermay" || 
         email === "managermay" ||
         user.role === "manager" ||
         user.isManager === true;
};
/* ---------- Main Component ---------- */
const PersonalArea = () => {
  const navigate = useNavigate();
   const location = useLocation();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || token === "null" || token === "undefined") {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [navigate, location]);
  // State variables
  const [activeTab, setActiveTab] = useState("userInfo");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);

  const [orders, setOrders] = useState([]);
  const [apiError, setApiError] = useState("");

  // Date filter + sort
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ username: "", email: "" });

  // Success popup state
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Cancel confirmation popup state
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
const userIsManager = isManagerMay(user);
  /* ---------- API Functions ---------- */
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

  const loadOrders = async () => {
    try {
      setIsOrdersLoading(true);
      setApiError("");
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const rawOrders = await fetchMyOrders(token);
      const normalized = rawOrders.map(normalizeOrder);
      const byId = new Map();
      
      for (const o of normalized) {
        const key = o.id || o.raw?._id?.$oid || o.raw?._id || null;
        if (!key) continue;
        if (!byId.has(key)) byId.set(key, o);
      }

      setOrders(Array.from(byId.values()));
    } catch (e) {
      console.error("orders fetch error", e);
      setApiError("Failed to load your orders.");
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  // Resolve attraction IDs to names
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

  // Initialize component
  useEffect(() => {
    (async () => {
      setIsInitialLoading(true);
      const u = await fetchUser();
      if (u?.id) {
        await loadOrders();
      }
      setIsInitialLoading(false);
    })();
  }, []);

  /* ---------- Computed Values ---------- */
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    // Date range bounds in local time (inclusive)
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    if (fromTime !== null || toTime !== null) {
      list = list.filter((o) => {
        const t = typeof o.createdAtTs === "number" ? o.createdAtTs : null;
        if (t === null) return false;
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
        return true;
      });
    }

    list.sort((a, b) => {
      const hasA = Number.isFinite(a.createdAtTs);
      const hasB = Number.isFinite(b.createdAtTs);

      // Always put items without a date at the end
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

  /* ---------- Event Handlers ---------- */
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

  const handleCancelOrder = (order) => {
    setOrderToCancel(order);
    setShowCancelPopup(true);
  };

  // Replace the confirmCancelOrder function in PersonalArea.jsx (around line 710)

// Replace the confirmCancelOrder function in PersonalArea.jsx (around line 710)

// Replace the confirmCancelOrder function in PersonalArea.jsx (around line 710)

const confirmCancelOrder = async () => {
  if (!orderToCancel) return;

  setIsCancelling(true);
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Authentication token not found");
    }
const response = await fetch(`${API_BASE}/api/order/cancel?id=${orderToCancel.id}`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  }
});

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to cancel order (${response.status})`);
    }

    // Update the orders list to reflect the cancellation
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderToCancel.id 
          ? { 
              ...order, 
              isCancelled: true, 
              cancelledAt: new Date().toISOString(), 
              raw: { 
                ...order.raw, 
                status: "cancelled", 
                cancelled: true,
                cancelled_at: new Date() 
              } 
            }
          : order
      )
    );

    setShowCancelPopup(false);
    setOrderToCancel(null);
    showSuccessMessage("Order cancelled successfully! Your refund will be processed within a few days.");

  } catch (error) {
    console.error("Cancel order error:", error);
    alert(`Failed to cancel order: ${error.message}`);
  } finally {
    setIsCancelling(false);
  }
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
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Newsletter endpoint not found on the server. Add /api/newsletter route.");
        }
        if (res.status === 409) {
          showSuccessMessage("You are already subscribed to the newsletter with this email!");
          setEmail("");
          return;
        }
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `HTTP ${res.status}`);
      }

      showSuccessMessage("Successfully subscribed to the newsletter! Check your inbox.");
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
    return <PageLoadingOverlay message="Loading your Profile..." />;
  }

  /* ---------- Render ---------- */
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
        {/* User Information Tab */}
      {activeTab === "userInfo" && (
  <>
    <h2 className="heading">User Profile</h2>
    <div className="profileInfo">
      {isUserLoading ? (
        <LoadingSpinner size="medium" message="Loading user details..." />
      ) : user ? (
        <>
          {/* Basic User Info */}
          <div className="user-info-card">
            <div className="user-avatar">
              <div className="avatar-circle">
                {user.username ? user.username.charAt(0).toUpperCase() : "U"}
              </div>
            </div>
            <div className="user-basic-info">
              <h3>{user.username}</h3>
              <p className="user-email">{user.email}</p>
              <p className="user-joined">
                Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "21.01.2023"}
              </p>
            </div>
          </div>

          {/* Membership Status */}
          <div className="membership-card">
            <h4>Membership Status</h4>
            <div className="membership-content">
              <div className={`membership-badge ${user.membershipLevel || 'bronze'}`}>
                <span className="membership-icon">
                  {user.membershipLevel === 'platinum' ? '💎' : 
                   user.membershipLevel === 'gold' ? '🏆' : 
                   user.membershipLevel === 'silver' ? '🥈' : '🥉'}
                </span>
                <span className="membership-level">
                  {(user.membershipLevel || 'Bronze').charAt(0).toUpperCase() + (user.membershipLevel || 'Bronze').slice(1)} Member
                </span>
              </div>
              <div className="membership-benefits">
                <p><strong>Your Benefits:</strong></p>
                <ul className="benefits-list">
                  {user.membershipLevel === 'platinum' ? (
                    <>
                      <li>✨ 25% discount on all bookings</li>
                      <li>🎯 Priority customer support</li>
                      <li>🏨 Free hotel upgrades when available</li>
                      <li>✈️ Complimentary airport lounge access</li>
                      <li>📞 24/7 concierge service</li>
                    </>
                  ) : user.membershipLevel === 'gold' ? (
                    <>
                      <li>⭐ 15% discount on all bookings</li>
                      <li>📞 Priority customer support</li>
                      <li>🏨 Free hotel upgrades when available</li>
                      <li>✈️ Priority check-in assistance</li>
                    </>
                  ) : user.membershipLevel === 'silver' ? (
                    <>
                      <li>💫 10% discount on all bookings</li>
                      <li>🎫 Early access to deals</li>
                      <li>📞 Dedicated support line</li>
                    </>
                  ) : (
                    <>
                      <li>🎫 Access to special deals</li>
                      <li>📧 Newsletter updates</li>
                      <li>💰 Points on every booking</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="membership-progress">
                <p><strong>Membership Progress:</strong></p>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${Math.min(100, (user.totalSpent || 0) / (user.nextLevelThreshold || 1000) * 100)}%`}}
                  ></div>
                </div>
                <p className="progress-text">
                  {user.membershipLevel !== 'platinum' ? 
                    `Spend ${toUsd((user.nextLevelThreshold || 1000) - (user.totalSpent || 0))} more to reach the next level!` :
                    'You\'ve reached the highest membership level! 🎉'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Newsletter Status */}
          <div className="newsletter-status-card">
            <h4>Newsletter Subscription</h4>
            <div className="newsletter-status-content">
              <div className={`newsletter-status ${user.newsletterSubscribed ? 'subscribed' : 'not-subscribed'}`}>
                <span className="status-icon">
                  {user.newsletterSubscribed ? '📧' : '📪'}
                </span>
                <div className="status-text">
                  <p className="status-title">
                    {user.newsletterSubscribed ? 'Subscribed to Newsletter' : 'Not Subscribed to Newsletter'}
                  </p>
                  <p className="status-description">
                    {user.newsletterSubscribed ? 
                      `You're receiving our latest travel deals and updates at ${user.email}` :
                      'Subscribe to get exclusive travel deals and destination guides'
                    }
                  </p>
                  {user.newsletterSubscribed && user.newsletterSubscribedAt && (
                    <p className="subscription-date">
                      Subscribed on: {new Date(user.newsletterSubscribedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              {!user.newsletterSubscribed && (
                <button 
                  className="subscribe-quick-btn"
                  onClick={() => setActiveTab("newsletter")}
                >
                  Subscribe Now
                </button>
              )}
            </div>
          </div>

          {/* Account Statistics */}
          <div className="account-stats-card">
            <h4>Account Statistics</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{orders.length}</span>
                <span className="stat-label">Total Orders</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {toUsd(orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0))}
                </span>
                <span className="stat-label">Total Spent</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">
                  {orders.filter(order => !order.isCancelled).length}
                </span>
                <span className="stat-label">Completed Trips</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{user.loyaltyPoints || 0}</span>
                <span className="stat-label">Loyalty Points</span>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="account-actions">
            <button className="action-btn secondary" onClick={() => setActiveTab("orders")}>
              View My Orders
            </button>
            <button className="action-btn secondary" onClick={() => navigate("/support")}>
              Contact Support
            </button>
            <button className="view-details-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </>
      ) : (
        <div>
          <p>No user data available</p>
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
                {/* Order Status */}
                {selectedOrder.isCancelled && (
                  <div className="order-status-cancelled">
                    <p className="order-status-cancelled-title">
                      ORDER CANCELLED
                    </p>
                    {selectedOrder.cancelledAt && (
                      <p className="order-status-cancelled-date">
                        Cancelled on: {new Date(selectedOrder.cancelledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="order-detail-grid">
                  <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Created At:</strong> {Number.isFinite(selectedOrder.createdAtTs) ? new Date(selectedOrder.createdAtTs).toLocaleDateString() : "—"}</p>
                  <p><strong>Trip Start:</strong> {Number.isFinite(selectedOrder.tripStartTs) ? new Date(selectedOrder.tripStartTs).toLocaleDateString() : "—"}</p>
                  <p><strong>Trip End:</strong> {Number.isFinite(selectedOrder.tripEndTs) ? new Date(selectedOrder.tripEndTs).toLocaleDateString() : "—"}</p>
                  <p><strong>Destination City:</strong> {selectedOrder.destination}</p>
                  <p><strong>Flight:</strong> {selectedOrder.flight}</p>
                  <p><strong>Hotel:</strong> {selectedOrder.hotel}</p>

                  {/* Attractions */}
                  <p className="full-width">
                    <strong>Attractions:</strong>{" "}
                    {(() => {
                      const rawNames = selectedOrder?.raw?.attraction_names;
                      const resolved = selectedOrder?.attractionNamesResolved;
                      const attrs = Array.isArray(selectedOrder?.attractions) ? selectedOrder.attractions : [];

                      const ID_RE = /^[0-9a-fA-F]{24}$/;
                      const onlyIds = attrs.length > 0 && attrs.every(v => typeof v === "string" && ID_RE.test(v));

                      const names =
                        (Array.isArray(resolved) && resolved.length ? resolved : null) ??
                        (Array.isArray(rawNames) && rawNames.length ? rawNames : null) ??
                        (attrs.length && !onlyIds ? attrs : []);

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
                  <p className="full-width">
                    <strong>Total Price:</strong> {toUsd(selectedOrder.totalPrice)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
      {activeTab === "orders" && (
  <>
    <h2 className="heading">Your Previous Orders</h2>

    {apiError && (
      <div style={{ color: "crimson", marginBottom: 12 }}>{apiError}</div>
    )}

    {/* Check if user is manager */}
    {userIsManager ? (
      <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
        <h3>The manager can't make orders</h3>
      </div>
    ) : isOrdersLoading ? (
      <LoadingSpinner size="large" message="Loading previous orders..." />
    ) : (
              <>
                {/* Date + sort filters */}
                <div className="orders-filters">
                  <div>
                    <label className="filter-label">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="filter-label">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="filter-label">Sort</label>
                    <select
                      value={sortDir}
                      onChange={(e) => setSortDir(e.target.value)}
                    >
                      <option value="desc">Newest first</option>
                      <option value="asc">Oldest first</option>
                    </select>
                  </div>
                  <div>
                    <button
                      onClick={clearFilters}
                      className="view-details-button filter-clear-btn"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <small className="filter-summary">
                  Showing: {filteredOrders.length} of {orders.length}
                </small>

                {filteredOrders.length > 0 ? (
                  <>
                    <ul className="orders-grid">
                      {currentPageOrders.map((o, index) => (
                        <li
                          key={o.id || (o.raw?._id?.$oid) || (o.raw?._id) || String(index)}
                          className={`order-card ${o.isCancelled ? 'order-card--cancelled' : ''}`}
                        >
                          {/* Cancel button - only show if order can be cancelled */}
                          {!o.isCancelled && o.canCancel && (
                            <button
                              className="cancel-order-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelOrder(o);
                              }}
                              title="Cancel Order"
                              aria-label="Cancel Order"
                            >
                              <svg 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="white" 
                                strokeWidth="2"
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18l-2 13H5L3 6z"></path>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          )}

                          {/* Cancelled badge */}
                          {o.isCancelled && (
                            <div className="cancelled-badge">CANCELLED</div>
                          )}

                          <div className="top">
                            <div className="route">
                              <strong>{o.departure} → {o.destination}</strong>
                            </div>
                            <div className="price">{toUsd(o.totalPrice)}</div>
                          </div>

                          <div className="meta">
                            <div><span className="lbl">Date of purchase</span>{Number.isFinite(o.createdAtTs) ? new Date(o.createdAtTs).toLocaleDateString() : "—"}</div>
                            <div><span className="lbl">Payment</span>{o.paymentMethod || "—"}</div>
                            <div><span className="lbl">Flight</span>{o.flight}</div>
                            <div><span className="lbl">Hotel</span>{o.hotel}</div>
                            <div>
                              <span className="lbl">Trip</span>
                              {o.tripStartTs
                                ? `${new Date(o.tripStartTs).toLocaleDateString()}${
                                    o.tripEndTs ? ` – ${new Date(o.tripEndTs).toLocaleDateString()}` : ""
                                  }`
                                : "—"}
                            </div>
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
                  <div className="empty-orders">
                    <p>No orders match the selected dates.</p>
                  </div>
                )}
              </>
            )}
          </>
        )}

      
      {/* Newsletter Tab */}
        {activeTab === "newsletter" && (
          <>
            <div className="newsletter-hero">
              <div className="newsletter-header">
                <div className="newsletter-icon">✈️</div>
                <h2 className="heading newsletter-title">Join Our Travel Community</h2>
                <p className="newsletter-subtitle">
                  Unlock exclusive deals and discover your next adventure with our insider newsletter
                </p>
              </div>
              
              <div className="newsletter-benefits">
                <h3>What you'll get:</h3>
                <div className="benefits-grid">
                  <div className="benefit-item">
                    <span className="benefit-icon">💰</span>
                    <div className="benefit-content">
                      <h4>Exclusive Deals</h4>
                      <p>Up to 40% off flights and hotels before anyone else</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">🗺️</span>
                    <div className="benefit-content">
                      <h4>Travel Guides</h4>
                      <p>Insider tips and hidden gems from our travel experts</p>
                    </div>
                  </div>
                  <div className="benefit-item">
                    <span className="benefit-icon">⚡</span>
                    <div className="benefit-content">
                      <h4>Flash Sales</h4>
                      <p>24-hour lightning deals on popular destinations</p>
                    </div>
                  </div>
                 
                </div>
              </div>

              <div className="newsletter-social-proof">
                <div className="social-proof-stats">
                  <div className="stat">
                    <span className="stat-number">50K+</span>
                    <span className="stat-label">Happy Travelers</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">$2M+</span>
                    <span className="stat-label">Savings Generated</span>
                  </div>
                  <div className="stat">
                    <span className="stat-number">95%</span>
                    <span className="stat-label">Satisfaction Rate</span>
                  </div>
                </div>
                
                <div className="testimonial">
                  <p className="testimonial-text">
                    "I saved over $800 on my European vacation thanks to their newsletter deals!"
                  </p>
                  <p className="testimonial-author">- Sarah M., Gold Member</p>
                </div>
              </div>

              <div className="newsletter-signup-section">
                <div className="signup-form">
                  <h3>Ready to start saving?</h3>
                  <p className="signup-description">
                    Join thousands of smart travelers who never miss a deal
                  </p>
                  
                  <div className="email-input-wrapper">
                    <input
                      type="email"
                      placeholder="Enter your email address"
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
                        <span className="newsletter-loading">
                          <div className="newsletter-loading-spinner" />
                          Loading...
                        </span>
                      ) : (
                        <>
                          Subscribe Now
                          <span className="button-icon">🚀</span>
                        </>
                      )}
                    </button>
                  </div>
                  
                  <div className="signup-guarantee">
                    <p>
                      📧 Weekly emails • 🔒 No spam, ever • 📱 Unsubscribe anytime
                    </p>
                  </div>
                </div>

                <div className="newsletter-preview">
                  <h4>Latest Newsletter Highlights</h4>
                  <div className="preview-items">
                    <div className="preview-item">
                      <span className="preview-date">This Week</span>
                      <h5>🏖️ Summer Escape: Bali from $299</h5>
                      <p>Limited time offer - 5 days left!</p>
                    </div>
                    <div className="preview-item">
                      <span className="preview-date">Last Week</span>
                      <h5>🎿 Alpine Adventure Guide</h5>
                      <p>Best ski resorts for every budget</p>
                    </div>
                    <div className="preview-item">
                      <span className="preview-date">Popular</span>
                      <h5>🍝 Food Lover's Italy Itinerary</h5>
                      <p>10 must-try restaurants in Rome</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

      {/* Cancel Confirmation Popup */}
      <CancelConfirmationPopup
        isVisible={showCancelPopup}
        onClose={() => {
          setShowCancelPopup(false);
          setOrderToCancel(null);
        }}
        onConfirm={confirmCancelOrder}
        orderDetails={orderToCancel}
        isLoading={isCancelling}
      />
    </div>
  );
};

export default PersonalArea;