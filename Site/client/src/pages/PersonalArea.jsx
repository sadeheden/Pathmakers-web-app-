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

const PersonalArea = () => {
  const navigate = useNavigate();
  

  const [activeTab, setActiveTab] = useState("userInfo");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const [orders, setOrders] = useState([]); // normalized orders
  const [apiError, setApiError] = useState("");

  // date filter + sort
  const [dateFrom, setDateFrom] = useState(""); // "YYYY-MM-DD"
  const [dateTo, setDateTo] = useState("");     // "YYYY-MM-DD"
  const [sortDir, setSortDir] = useState("desc"); // "desc" | "asc"

  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState({ username: "", email: "" });

  /* ---------- user fetch ---------- */
  const fetchUser = async () => {
    try {
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
    }
  };

  /* ---------- orders fetch ---------- */
  const loadOrders = async () => {
    try {
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
    }
  };

  /* ---------- init ---------- */
  useEffect(() => {
    (async () => {
      const u = await fetchUser();
      if (u?.id) await loadOrders();
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
        alert("You're already subscribed with this email. ✅");
        setEmail("");
        return;
      }
      const j = await res.json().catch(() => ({}));
      throw new Error(j.message || `HTTP ${res.status}`);
    }

    alert("Subscription successful — check your inbox!");
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
  className={activeTab === "orders" ? "active" : ""}   // stays the same
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
              {user ? (
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
                  <p>Loading user data...</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Order Details Modal */}
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
              return names.length
                ? <span className="chip-list">{names.map((n,i)=><span key={i} className="chip">{n}</span>)}</span>
                : "—";
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
              {loading ? "Subscribing..." : "Subscribe"}
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
    </div>
  );
};

export default PersonalArea;
