import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../assets/styles/main.css";
import flag from "../assets/images/flag.jpg";
import { API_BASE } from "../api.js";

// React icons
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Images
import parisImg from "../assets/images/paris.png";
import tokyoImg from "../assets/images/tokyo.png";
import newYorkImg from "../assets/images/newyork.png";
import barcelonaImg from "../assets/images/barcelona.png";
import romeImg from "../assets/images/rome.png";
import londonImg from "../assets/images/london.png";
import bangkokImg from "../assets/images/bangkok.png";
import dubaiImg from "../assets/images/dubai.png";

// Cities data (no hardcoded DB IDs)
const cities = [
  { img: parisImg, name: "Paris", slug: "paris", flight: "AF123", summary: "Art & Romance", transportation: "Public Transport" },
  { img: tokyoImg, name: "Tokyo", slug: "tokyo", flight: "JL456", summary: "Neon & Tradition", transportation: "Train" },
  { img: newYorkImg, name: "New York", slug: "new-york", flight: "DL789", summary: "City That Never Sleeps", transportation: "Taxi" },
  { img: barcelonaImg, name: "Barcelona", slug: "barcelona", flight: "IB234", summary: "Beaches & Gaudí", transportation: "Bus" },
  { img: romeImg, name: "Rome", slug: "rome", flight: "AZ567", summary: "History & Pasta", transportation: "Metro" },
  { img: londonImg, name: "London", slug: "london", flight: "BA890", summary: "Royalty & Culture", transportation: "Underground" },
  { img: bangkokImg, name: "Bangkok", slug: "bangkok", flight: "TG321", summary: "Temples & Street Food", transportation: "Tuk-Tuk" },
  { img: dubaiImg, name: "Dubai", slug: "dubai", flight: "EK654", summary: "Luxury & Desert", transportation: "Car" },
];

function slugifyCity(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

// ---- helpers for attractions (doc-per-city -> array of objects) ----
async function fetchCityAttractionNames(API_BASE, cityName, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const fetchJson = async (url) => {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  };

const candidates = [
    // your current route
    `${API_BASE}/api/attractions/city/${encodeURIComponent(cityName)}`,
    // slug version
    `${API_BASE}/api/attractions/city/${encodeURIComponent(slugifyCity(cityName))}`,
    // query-string fallback
    `${API_BASE}/api/attractions?city=${encodeURIComponent(cityName)}`,
  ];

  // Unwrap common response shapes into { attractions: [...] }
  const unwrap = (j) => {
    if (!j) return null;
    // { city, attractions: [...] }
    if (j.city && Array.isArray(j.attractions)) return j;
    // { data: { city, attractions } }
    if (j.data && !Array.isArray(j.data) && Array.isArray(j.data.attractions)) return j.data;
    // { data: [ { city, attractions }, ... ] } or [ { city, attractions }, ... ]
    const arr = Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : null;
    if (arr && arr.length && Array.isArray(arr[0].attractions)) return arr[0];
    return null;
  };

  for (const url of candidates) {
    const j = await fetchJson(url);
    const doc = unwrap(j);
    if (doc) {
      const names = Array.from(
        new Set(
          (doc.attractions || [])
            .map(a => a && a.name)
            .filter(Boolean)
            .map(String)
        )
      );
      if (names.length) return names;
    }
  }

  // Last-resort client fallback so something gets saved visually
  const localFallback = {
    Paris: ["Eiffel Tower", "Louvre Museum", "Notre-Dame"],
    Tokyo: ["Senso-ji", "Shibuya Crossing", "Tokyo Skytree"],
    "New York": ["Central Park", "Times Square", "Statue of Liberty"],
    Barcelona: ["Sagrada Família", "Park Güell", "La Rambla"],
    Rome: ["Colosseum", "Trevi Fountain", "Pantheon"],
    London: ["Tower Bridge", "British Museum", "Buckingham Palace"],
    Bangkok: ["Grand Palace", "Wat Arun", "Chatuchak Market"],
    Dubai: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah"],
  };
  return localFallback[cityName] || [];
}

// Price helper
const getPriceByCity = (cityName) => {
  switch (cityName) {
    case "Paris": return 1800;
    case "Tokyo": return 2200;
    case "New York": return 2000;
    case "Barcelona": return 1700;
    case "Rome": return 1600;
    case "London": return 1900;
    case "Bangkok": return 1500;
    case "Dubai": return 2100;
    default: return 2000;
  }
};

// Helper function לפורמט תאריך ל YYYY-MM-DD
const formatDateForInput = (date) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

// Helper function לחישוב מינימום תאריך (מחר)
const getMinDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForInput(tomorrow);
};

// Helper function לחישוב מקסימום תאריך (שנה מהיום)
const getMaxDate = () => {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  return formatDateForInput(nextYear);
};

// ------- Payment Modal -------
const PaymentModal = ({ isOpen, onClose, totalAmount, onPaymentSuccess }) => {
  const [fullName, setFullName] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState("");
  const currentYear = new Date().getFullYear();
  const maxYear = currentYear + 10;


  const handlePayment = () => {
    const errors = [];

    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.push("⚠ Invalid Full Name. Enter at least 3 characters.");
    }
    if (!/^\d{16}$/.test(paymentDetails)) {
      errors.push("⚠ Invalid Payment Number. Must be 16 digits.");
    }
    const expiryMatch = expiryDate.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
    if (!expiryMatch || parseInt(expiryMatch[2], 10) < currentYear || parseInt(expiryMatch[2], 10) > maxYear) {
      errors.push(`⚠ Invalid Expiry Date. Must be MM/YYYY between ${currentYear}-${maxYear}.`);
    }
    if (!/^\d{3}$/.test(cvv)) {
      errors.push("⚠ Invalid CVV. Must be exactly 3 digits.");
    }
    if (errors.length) {
      setError(errors.join("\n"));
      return;
    }

    setError("");
    setPaymentSuccess(true);

    setTimeout(() => {
      setPaymentSuccess(false);
      onClose();
      onPaymentSuccess();
      setFullName("");
      setPaymentDetails("");
      setExpiryDate("");
      setCvv("");
      setError("");
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
            <h2>Payment</h2>
            <p><strong>Total Amount: ${totalAmount}</strong></p>
            {error && <p className="error-message" style={{ whiteSpace: "pre-line" }}>{error}</p>}

            <label>Full Name</label>
            <input type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />

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
                <input type="text" placeholder="MM/YYYY" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
              <div>
                <label>CVV</label>
                <input type="text" placeholder="123" maxLength="3" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>

            <button className="btn btn-primary modal-btn" onClick={handlePayment} disabled={paymentSuccess}>
              {paymentSuccess ? "Processing..." : `Pay $${totalAmount}`}
            </button>
            <button className="btn btn-light modal-btn" onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
};
// === conflict helpers (client-side fallback) ===
const getAuthToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("access_token") ||
  localStorage.getItem("userToken");

const toDayStart = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const toDayEnd = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const overlaps = (aStart, aEnd, bStart, bEnd) =>
  aStart <= bEnd && aEnd >= bStart;

const namesEqual = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

/** Robust date reader: supports Date, ISO string, or Mongo extended JSON */
const readDate = (val) => {
  if (!val) return null;
  // Mongo extended {"$date":{"$numberLong":"..."}}
  if (val.$date) {
    const n = typeof val.$date === "object" ? Number(val.$date.$numberLong) : Number(val.$date);
    return isNaN(n) ? null : new Date(n);
  }
  // plain millis in string/number
  if (typeof val === "string" && /^\d+$/.test(val)) return new Date(Number(val));
  // ISO or Date
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

/** Fetch current user's orders (works with array or {data:[]}/{orders:[]} shapes) */
async function fetchMyOrders(API_BASE) {
  const token = getAuthToken();
  if (!token) throw new Error("NO_TOKEN");
  const r = await fetch(`${API_BASE}/api/orders2`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`ORDERS_FETCH_${r.status}`);
  const j = await r.json();
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.data)) return j.data;
  if (Array.isArray(j?.orders)) return j.orders;
  return [];
}

/** Pure local overlap check across your likely fields */
async function checkConflictLocal({ API_BASE, destination, tripDate, returnDate }) {
  try {
    const orders = await fetchMyOrders(API_BASE);

    const newStart = toDayStart(tripDate);
    const newEnd = toDayEnd(returnDate);

    const hit = orders.find((o) => {
      const dest =
        o?.destination_city_name ??
        o?.destination ??
        o?.cityName ??
        o?.destinationCityName ??
        o?.city_name;

      // match same destination only (as you requested)
      if (!namesEqual(dest, destination)) return false;

      // read stored dates (many shapes supported)
      const oStart = readDate(o?.tripDate) ?? readDate(o?.startDate) ?? readDate(o?.trip_date);
      const oEnd   = readDate(o?.returnDate) ?? readDate(o?.endDate)   ?? readDate(o?.return_date);

      if (!oStart || !oEnd) return false;
      return overlaps(newStart, newEnd, toDayStart(oStart), toDayEnd(oEnd));
    });

    if (hit) {
      return {
        conflict: true,
        message: `You already have a trip to ${destination} during these dates.`,
        order: {
          id: hit._id,
          tripDate: hit.tripDate ?? hit.startDate ?? hit.trip_date,
          returnDate: hit.returnDate ?? hit.endDate ?? hit.return_date,
          destination:
            hit.destination_city_name ??
            hit.destination ??
            hit.cityName ??
            hit.destinationCityName,
        },
      };
    }
    return { conflict: false };
  } catch (e) {
    console.warn("Local conflict check failed:", e.message || e);
    return { conflict: false, _error: "LOCAL_CHECK_FAILED" };
  }
}

// ------- Main Page -------
const Main = () => {
  const navigate = useNavigate();
const [conflictInfo, setConflictInfo] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  const [orderError, setOrderError] = useState("");
 const [conflictCheck, setConflictCheck] = useState({
  checking: false,
  hasConflict: false,
  message: ''
});

  // תאריכי טיול - מתחילים עם תאריכים ברירת מחדל
  const [tripDate, setTripDate] = useState("");
 const [returnDate, setReturnDate] = useState("");
  const [dateError, setDateError] = useState("");

  const rowRef = useRef(null);
  const savingRef = useRef(false);
  const [hasSaved, setHasSaved] = useState(false);

  // stable random key per page mount
  const idemKey = useMemo(
    () =>
      (globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : String(Date.now()) + Math.random()),
    []
  );

  const CARD_WIDTH = 240;
  const GAP = 24;

  const totalPrice = selectedCity ? getPriceByCity(selectedCity.name) : 0;

  const scrollByCards = (n) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: (CARD_WIDTH + GAP) * n, behavior: "smooth" });
  };
// Try server endpoint(s). If 404 or network error, fall back to local scan.
// Local-only conflict check — blocks on ANY overlapping order by default.
// Replace your existing checkOrderConflict function with this corrected version:

async function checkOrderConflict({ destination, tripDate, returnDate }) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("userToken");

  if (!token) {
    return { conflict: false, _error: "NO_TOKEN" };
  }

  try {
    console.log('Checking for conflicts:', { destination, tripDate, returnDate });

    // Use the dedicated conflict checking endpoint instead of fetching all orders
    const params = new URLSearchParams({
      destination: destination,
      tripDate: tripDate,
      returnDate: returnDate
    });

    const response = await fetch(`${API_BASE}/api/orders2/conflicts?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Conflict check failed:', response.status, response.statusText);
      
      // If the conflicts endpoint doesn't exist, fall back to client-side checking
      if (response.status === 404) {
        console.warn('Conflict endpoint not found, falling back to client-side check');
        return await checkOrderConflictFallback({ destination, tripDate, returnDate, token });
      }
      
      return { 
        conflict: false, 
        _error: `CONFLICT_CHECK_FAILED_${response.status}` 
      };
    }

    const data = await response.json();
    console.log('Conflict check response:', data);

    if (!data.success) {
      return { 
        conflict: false, 
        _error: data.message || "CONFLICT_CHECK_FAILED" 
      };
    }

    if (data.conflict) {
      return {
        conflict: true,
        message: data.message || `You already have a trip to ${destination} during these dates.`,
        existingOrder: data.order
      };
    }

    return { conflict: false };

  } catch (error) {
    console.error('Conflict check error:', error);
    
    // If network error, try fallback
    console.warn('Network error, attempting fallback conflict check');
    return await checkOrderConflictFallback({ destination, tripDate, returnDate, token });
  }
}

// Fallback function (your original logic) - only used if the main endpoint fails
async function checkOrderConflictFallback({ destination, tripDate, returnDate, token }) {
  try {
    const resp = await fetch(`${API_BASE}/api/orders2`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!resp.ok) {
      return { conflict: false, _error: `ORDERS_FETCH_${resp.status}` };
    }

    const data = await resp.json();
    const orders = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.orders)
      ? data.orders
      : [];

    const toDayStart = (d) => { 
      const x = new Date(d); 
      x.setHours(0, 0, 0, 0); 
      return x; 
    };
    
    const toDayEnd = (d) => { 
      const x = new Date(d); 
      x.setHours(23, 59, 59, 999); 
      return x; 
    };
    
    const overlaps = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && aEnd >= bStart;
    
    const namesEqual = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

    const readDate = (val) => {
      if (!val) return null;
      if (val.$date) {
        const n = typeof val.$date === "object" ? Number(val.$date.$numberLong) : Number(val.$date);
        return isNaN(n) ? null : new Date(n);
      }
      if (typeof val === "string" && /^\d+$/.test(val)) return new Date(Number(val));
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const newStart = toDayStart(tripDate);
    const newEnd = toDayEnd(returnDate);

    const hit = orders.find((o) => {
      const destStored =
        o?.destination_city_name ??
        o?.destination ??
        o?.cityName ??
        o?.destinationCityName ??
        o?.city_name;

      // Check same destination
      if (!namesEqual(destStored, destination)) return false;

      // Check dates
      const oStart =
        readDate(o?.tripDate) ??
        readDate(o?.startDate) ??
        readDate(o?.trip_date);

      let oEnd =
        readDate(o?.returnDate) ??
        readDate(o?.endDate) ??
        readDate(o?.return_date);

      if (oStart && !oEnd) {
        oEnd = new Date(oStart);
        oEnd.setDate(oEnd.getDate() + 7);
      }

      if (!oStart || !oEnd) return false;

      return overlaps(newStart, newEnd, toDayStart(oStart), toDayEnd(oEnd));
    });

    if (hit) {
      const destStored =
        hit?.destination_city_name ??
        hit?.destination ??
        hit?.cityName ??
        hit?.destinationCityName ??
        hit?.city_name ??
        destination;

      return {
        conflict: true,
        message: `You already have a trip to ${destStored} overlapping these dates.`,
        existingOrder: hit,
      };
    }
    
    return { conflict: false };
    
  } catch (e) {
    console.warn("Fallback conflict check error:", e?.message || e);
    return { conflict: false, _error: "LOCAL_CHECK_FAILED" };
  }
}


// Add this new function to perform real-time conflict checking:
// Replace your existing performConflictCheck function with this updated version:

const performConflictCheck = async (city, departure, returnD) => {
  if (!city || !departure || !returnD) {
    setConflictCheck({ checking: false, hasConflict: false, message: '' });
    return;
  }

  // Don't check if dates are invalid
  const depDate = new Date(departure);
  const retDate = new Date(returnD);
  if (isNaN(depDate.getTime()) || isNaN(retDate.getTime()) || retDate <= depDate) {
    setConflictCheck({ checking: false, hasConflict: false, message: '' });
    return;
  }

  setConflictCheck({ checking: true, hasConflict: false, message: '' });

  try {
    const result = await checkOrderConflict({
      destination: city,
      tripDate: departure,
      returnDate: returnD,
    });

    if (result._error) {
      console.warn('Conflict check failed:', result._error);
      setConflictCheck({
        checking: false,
        hasConflict: false,
        message: 'Could not verify conflicts right now.',
      });
      return;
    }

    if (result.conflict) {
      setConflictCheck({
        checking: false,
        hasConflict: true,
        message: result.message || `You already have a trip to ${city} during these dates`,
      });
    } else {
      setConflictCheck({ 
        checking: false, 
        hasConflict: false, 
        message: '' 
      });
    }
  } catch (error) {
    console.error('Error in performConflictCheck:', error);
    setConflictCheck({
      checking: false,
      hasConflict: false,
      message: 'Error checking for conflicts.',
    });
  }
};
  // פונקציה לבדיקת תקינות תאריכים
const validateDates = (departure, returnD) => {
  const depDate = new Date(departure);
  const retDate = new Date(returnD);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (depDate <= today) {
    return "Trip date must be at least tomorrow";
  }
  if (retDate <= depDate) {
    return "Return date must be after trip date";
  }
  
  const diffDays = (retDate - depDate) / (1000 * 60 * 60 * 24);
  
  // Add this validation to enforce exactly 7 days:
  if (diffDays !== 7) {
    return "All trips must be exactly 7 days";
  }
  
  if (diffDays > 365) {
    return "Trip cannot be longer than one year";
  }
  return "";
};

// Replace the existing handleTripDateChange function with this:
const handleTripDateChange = (newDate) => {
  setTripDate(newDate);
  setDateError("");
  setOrderError("");

  // Always automatically set return date to exactly 7 days after departure
  const newReturnDate = new Date(newDate);
  newReturnDate.setDate(newReturnDate.getDate() + 7);
  const autoReturnDate = formatDateForInput(newReturnDate);
  
  setReturnDate(autoReturnDate);
  performConflictCheck(selectedCity?.name, newDate, autoReturnDate);
};

const handleReturnDateChange = (newDate) => {
  setReturnDate(newDate);
  setOrderError("");

  if (tripDate && new Date(newDate) <= new Date(tripDate)) {
    setDateError("תאריך חזרה חייב להיות אחרי תאריך היציאה");
    setConflictCheck({ checking: false, hasConflict: false, message: "" });
    return;
  }

  setDateError("");
  performConflictCheck(selectedCity?.name, tripDate, newDate);
};


  return (
    <div className="trips-page">
      <section className="hero-merged" style={{ backgroundImage: `url(${flag})` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Let's Plan Your Next Adventure!</h1>
          <p>From dreamy escapes to thrilling getaways find your perfect trip with a little magic</p>
        </div>
      </section>

      <section className="chat-options">
        <div className="chat-card">
          <h3>AI Trip Builder</h3>
          <p>Let our AI recommend the perfect trip for you in seconds.</p>
          <button className="btn btn-primary" onClick={() => navigate("/realChat")}>Start Chatting</button>
        </div>
        <div className="chat-card">
          <h3>Build Your Own</h3>
          <p>Plan every detail yourself with our manual trip builder.</p>
          <button className="btn btn-light" onClick={() => navigate("/chat")}>Start Planning</button>
        </div>
      </section>

      <section className="popular-trips">
        <h2>Traveler-Favorite Destinations</h2>
        <div className="city-scroll-wrapper">
          <button className="scroll-btn left" aria-label="Scroll left" onClick={() => scrollByCards(-1)}>
            <FiChevronLeft />
          </button>

          <div className="city-row" ref={rowRef}>
            {cities.map((city, i) => (
              <div
                className="city-card"
                key={i}
                onClick={() => {
                  // allow one save per city selection
                  sessionStorage.removeItem("mainOrders2Saved");
                  setHasSaved(false);
                  savingRef.current = false;

                  setSelectedCity(city);
                  setPaymentCompleted(false);
                  setShowPaymentModal(false);
                  setShowIntroPopup(true);
                  setDateError(""); // נקה שגיאות תאריכים
                  setOrderError("");
                  setConflictCheck({ checking: false, hasConflict: false, message: "" });
                  setTripDate("");
                  setReturnDate("");
                                  }}
              >
                <img src={city.img} alt={city.name} />
                <div className="city-card-text">
                  <h3>{city.name}</h3>
                  <p className="muted">{city.summary}</p>
                </div>
              </div>
            ))}
          </div>

          <button className="scroll-btn right" aria-label="Scroll right" onClick={() => scrollByCards(1)}>
            <FiChevronRight />
          </button>
        </div>
      </section>

      {/* Intro Popup */}
  {/* Intro Popup */}
{selectedCity && showIntroPopup && (
  <div
    className="modal-overlay"
    onClick={() => {
      // Clicking the backdrop should dismiss the intro and cancel selection
      setShowIntroPopup(false);
      setSelectedCity(null);
    }}
  >
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <button
        className="modal-close-x"
        onClick={() => {
          // X button = just close the intro and cancel selection (no dates set)
          setShowIntroPopup(false);
          setSelectedCity(null);
        }}
        aria-label="Close"
      >
        &#10005;
      </button>

      <h2>You've Selected {selectedCity.name}!</h2>
      <p>
        ✈️ Awesome! You're about to see your trip details to <strong>{selectedCity.name}</strong>.<br />
        This includes flight number, departure info, and you can choose your preferred dates.
      </p>
      <p>Click <strong>Continue</strong> to choose dates and proceed to payment.</p>
      <p><strong>Price per person: ${getPriceByCity(selectedCity.name)}</strong></p>

      <button
        className="btn btn-primary modal-btn"
        onClick={() => {
          // Continue = set sensible defaults and open the date modal
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const ret = new Date(tomorrow);
          ret.setDate(ret.getDate() + 7);

          setTripDate(tomorrow.toISOString().split("T")[0]);
          setReturnDate(ret.toISOString().split("T")[0]);

          // reset any previous errors/state before showing date modal
          setDateError("");
          setOrderError("");
          setConflictCheck({ checking: false, hasConflict: false, message: "" });

          // close intro -> date modal will show because selectedCity stays set
          setShowIntroPopup(false);
        }}
      >
        Continue
      </button>
    </div>
  </div>
)}


{conflictInfo && (
  <div className="modal-overlay" onClick={() => setConflictInfo(null)}>
    <div
      className="modal-content"
      onClick={(e) => e.stopPropagation()}
      style={{
        borderLeft: '6px solid #dc3545',
        boxShadow: '0 12px 30px rgba(220,53,69,0.25)',
      }}
    >
      <button
        className="modal-close-x"
        onClick={() => setConflictInfo(null)}
        aria-label="Close"
        style={{ color: '#dc3545' }}
      >
        ✕
      </button>

      <h2 style={{ color: '#dc3545', marginTop: 0 }}>Can’t create order</h2>

      {conflictInfo.kind === 'conflict' ? (
        <p style={{ lineHeight: 1.5 }}>
          You already have an order on these dates for <strong>{conflictInfo.destination}</strong>.<br />
          Please choose different dates.
        </p>
      ) : (
        <p style={{ lineHeight: 1.5 }}>
          We couldn’t verify conflicts right now. Please try again later.
        </p>
      )}

      <div className="modal-btns">
        <button
          className="btn btn-primary modal-btn"
          onClick={() => setConflictInfo(null)}
          style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}




      {/* Trip Details Modal עם בחירת תאריכים */}
      {selectedCity && !paymentCompleted && !showPaymentModal && !showIntroPopup && (
        <div className="modal-overlay" onClick={() => setSelectedCity(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-x" onClick={() => setSelectedCity(null)} aria-label="Close">
              &#10005;
            </button>
            <h2>Plan Your Trip to {selectedCity.name}!</h2>
            <div className="modal-image-wrapper">
              <img src={selectedCity.img} alt={selectedCity.name} className="modal-city-image" />
            </div>
            
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <p><strong>Destination:</strong> {selectedCity.name}</p>
              <p><strong>Departure:</strong> Tel Aviv (Ben-Gurion Airport)</p>
              <p><strong>Flight Number:</strong> {selectedCity.flight}</p>
              <p><strong>Transportation:</strong> {selectedCity.transportation}</p>
            </div>

            {/* בחירת תאריכים */}
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>📅 Choose Your Travel Dates</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Departure Date:
                  </label>
                  <input
                    type="date"
                    value={tripDate}
                    min={getMinDate()}
                    max={getMaxDate()}
                    onChange={(e) => handleTripDateChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
<div>
  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
    Return Date:
  </label>
  <input
    type="date"
    value={returnDate}
    readOnly // Make it read-only so user can't change it
    style={{
      width: '100%',
      padding: '8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      backgroundColor: '#f8f9fa', // Gray background to show it's read-only
      cursor: 'not-allowed'
    }}
  />
</div>

                          </div>

              {dateError && (
                <div style={{ color: '#dc3545', fontSize: '14px', marginTop: '5px' }}>
                  ⚠️ {dateError}
                </div>
              )}

           {tripDate && returnDate && !dateError && (
  <div style={{ marginTop: '10px' }}>
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#e8f5e8', 
      borderRadius: '4px', 
      fontSize: '14px',
      marginBottom: '8px'
    }}>
      ✅ Trip Duration: {Math.ceil((new Date(returnDate) - new Date(tripDate)) / (1000 * 60 * 60 * 24))} days
    </div>
    
    {/* Conflict checking status */}
    {conflictCheck.checking && (
      <div style={{ 
        padding: '8px', 
        backgroundColor: '#fff3cd', 
        border: '1px solid #ffeaa7',
        borderRadius: '4px', 
        fontSize: '13px',
        color: '#856404'
      }}>
        🔍 Checking for existing trips...
      </div>
    )}
    
    {/* Conflict warning */}
    {conflictCheck.hasConflict && (
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f8d7da', 
        border: '1px solid #f5c6cb',
        borderRadius: '4px', 
        fontSize: '14px',
        color: '#721c24'
      }}>
        ⚠️ {conflictCheck.message}
        <br />
        <small>Please choose different dates to proceed.</small>
      </div>
    )}
  </div>
)}
              {orderError && (
  <div
    style={{
      marginTop: '10px',
      padding: '10px',
      backgroundColor: '#fdecea',   // light red
      border: '1px solid #f5c2c7',  // red border
      color: '#842029',             // dark red text
      borderRadius: '4px',
      fontSize: '14px'
    }}
  >
    {orderError}
  </div>
)}

            </div>

            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0066cc' }}>
                Total Price: ${totalPrice}
              </p>
            </div>

            <div className="modal-btns">
      

<button
  className="btn btn-primary modal-btn"
  onClick={async () => {
    // First validate dates
    const validationError = validateDates(tripDate, returnDate);
    if (validationError) {
      setDateError(validationError);
      setOrderError("");
      return;
    }

    setDateError("");
    setOrderError("");

    // Show loading state
    setConflictCheck({ checking: true, hasConflict: false, message: '' });

    try {
      // Check for conflicts using the server endpoint
      const result = await checkOrderConflict({ 
        destination: selectedCity.name, 
        tripDate, 
        returnDate 
      });

      setConflictCheck({ checking: false, hasConflict: false, message: '' });

      if (result._error) {
        console.warn('Conflict check failed:', result._error);
        // If conflict check fails, warn user but allow them to proceed
        const proceed = window.confirm(
          "Could not verify if you have existing trips on these dates. Would you like to proceed anyway?"
        );
        if (!proceed) return;
      } else if (result.conflict) {
        // Conflict found - show error and prevent proceeding
        setOrderError(result.message || "You already have a trip during these dates. Please choose different dates.");
        return;
      }

      // No conflicts found - proceed to payment
      setShowPaymentModal(true);

    } catch (error) {
      console.error('Error during conflict check:', error);
      setConflictCheck({ checking: false, hasConflict: false, message: '' });
      
      // On error, ask user if they want to proceed
      const proceed = window.confirm(
        "Could not verify conflicts due to a network error. Would you like to proceed anyway?"
      );
      if (proceed) {
        setShowPaymentModal(true);
      }
    }
  }}
  disabled={!tripDate || !returnDate || conflictCheck.checking}
>
  {conflictCheck.checking ? "Checking for conflicts..." : "Continue to Payment"}
</button>

            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={totalPrice}
          onPaymentSuccess={async () => {
            // 🔒 Strong client guard to avoid duplicate POSTs
            if (hasSaved || savingRef.current || sessionStorage.getItem("mainOrders2Saved") === "1") {
              console.log("🔒 Blocked duplicate save");
              return;
            }
            savingRef.current = true;
            sessionStorage.setItem("mainOrders2Saved", "1");

            setPaymentCompleted(true);
            setShowPaymentModal(false);

            const token =
              localStorage.getItem("token") ||
              localStorage.getItem("authToken") ||
              localStorage.getItem("jwt") ||
              localStorage.getItem("access_token") ||
              localStorage.getItem("userToken");

            if (!token) {
              alert("Please log in to complete your purchase");
              savingRef.current = false;
              sessionStorage.removeItem("mainOrders2Saved");
              navigate("/login");
              return;
            }

            // simple token expiry check
            const isTokenExpired = (tok) => {
              try {
                const payload = JSON.parse(atob(tok.split(".")[1]));
                return payload.exp * 1000 < Date.now();
              } catch {
                return true;
              }
            };
            if (isTokenExpired(token)) {
              alert("Your session has expired. Please log in again.");
              localStorage.removeItem("token");
              savingRef.current = false;
              sessionStorage.removeItem("mainOrders2Saved");
              navigate("/login");
              return;
            }

            try {
              if (!selectedCity) throw new Error("No city selected");
              // 🔎 fetch attractions for the selected city
              const attractionNames =
                await fetchCityAttractionNames(API_BASE, selectedCity.name, token);

              const response = await axios.post(
                `${API_BASE}/api/orders2`,
                {
                  // Display fields only (no DB IDs)
                  departureCityName: "Tel Aviv",
                  destinationCityName: selectedCity.name,
                  flightName: selectedCity.flight,
                  hotelName: `${selectedCity.name} Hotel`,

                  // Legacy display fields used by UI
                  cityName: selectedCity.name,
                  citySlug: selectedCity.slug,
                  flightNumber: selectedCity.flight,
                  departure: "Tel Aviv",
                  destination: selectedCity.name,
                  summary: selectedCity.summary,
                  cityImage: selectedCity.img,

                  // Trip data עם התאריכים שנבחרו
                  transportation: selectedCity.transportation,
                  paymentMethod: "Credit Card",
                  totalPrice,
                  tripDate,
                  returnDate,
                  bookingDate: new Date().toISOString(),

                  // Keep canonical IDs empty (backend can resolve/enrich)
                  departure_city_id: null,
                  destination_city_id: null,
                  flight_id: null,
                  hotel_id: null,
                  attractions: [],
                  attraction_names: attractionNames,
                  attractionNames: attractionNames,
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Idempotency-Key": idemKey,
                    "X-Request-ID": (globalThis.crypto?.randomUUID?.()
                      ?? `${Date.now()}-${Math.random()}`),
                    "X-Source-Component": "Main.jsx",
                  },
                }
              );

              console.log("✅ Order created successfully:", response.data);
              setHasSaved(true);
     } catch (error) {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    // Server blocked due to overlapping order
    setShowPaymentModal(false);
    setPaymentCompleted(false);
    setOrderError("Can't create order — you already have an order on those dates.");
  } else {
    console.error("❌ Order creation error:", error.response?.data || error.message);
    setShowPaymentModal(false);
    setPaymentCompleted(false);
    setOrderError("There was a problem creating your order. Please try again.");
  }
  // allow retry
  sessionStorage.removeItem("mainOrders2Saved");
} finally {
  savingRef.current = false;
}


          }}
        />
      )}
      
      <button 
        className="floating-support-btn"
        onClick={() => navigate('/support')}
      >
        ❔
      </button>
    </div>
  );
};

export default Main;