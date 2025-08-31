// Main.jsx - עם בחירת תאריכים

import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../assets/styles/main.css";
import flag from "../assets/images/flag.jpg";
import { API_BASE } from "../config/api";

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

// ------- Main Page -------
const Main = () => {
  const navigate = useNavigate();

  const [selectedCity, setSelectedCity] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);
  
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

  // פונקציה לבדיקת תקינות תאריכים
  const validateDates = (departure, returnD) => {
    const depDate = new Date(departure);
    const retDate = new Date(returnD);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (depDate <= today) {
      return "תאריך יציאה חייב להיות לפחות מחר";
    }
    if (retDate <= depDate) {
      return "תאריך חזרה חייב להיות אחרי תאריך היציאה";
    }
    const diffDays = (retDate - depDate) / (1000 * 60 * 60 * 24);
    if (diffDays < 1) {
      return "הטיול חייב להיות לפחות יום אחד";
    }
    if (diffDays > 365) {
      return "הטיול לא יכול להיות יותר משנה";
    }
    return "";
  };

  // טיפול בשינוי תאריך יציאה
  const handleTripDateChange = (newDate) => {
    setTripDate(newDate);
    setDateError("");
    
    // אם תאריך החזרה קטן או שווה לתאריך היציאה החדש, עדכן אותו
    if (returnDate <= newDate) {
      const newReturnDate = new Date(newDate);
      newReturnDate.setDate(newReturnDate.getDate() + 7); // ברירת מחדל של שבוע
      setReturnDate(formatDateForInput(newReturnDate));
    }
  };

  // טיפול בשינוי תאריך חזרה
  const handleReturnDateChange = (newDate) => {
    setReturnDate(newDate);
    setDateError("");
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
      {selectedCity && showIntroPopup && (
        <div className="modal-overlay" onClick={() => setShowIntroPopup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close-x"
              onClick={() => {
                setShowIntroPopup(false);
    // default dates: tomorrow → +7 days
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const ret = new Date(tomorrow);
      ret.setDate(ret.getDate() + 7);
      setTripDate(tomorrow.toISOString().split('T')[0]);
      setReturnDate(ret.toISOString().split('T')[0]);
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
            <button className="btn btn-primary modal-btn" onClick={() => setShowIntroPopup(false)}>
              Continue
            </button>
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
                min={
                  tripDate
                    ? new Date(new Date(tripDate).getTime() + 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0] // תמיד יום אחרי tripDate
                    : getMinDate()
                }
                max={getMaxDate()}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  if (tripDate && new Date(selectedDate) <= new Date(tripDate)) {
                    alert("תאריך החזרה חייב להיות אחרי תאריך היציאה 🚫");
                    return;
                  }
                  handleReturnDateChange(selectedDate);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
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
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px', fontSize: '14px' }}>
                  ✅ Trip Duration: {Math.ceil((new Date(returnDate) - new Date(tripDate)) / (1000 * 60 * 60 * 24))} days
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
                onClick={() => {
                  const validationError = validateDates(tripDate, returnDate);
                  if (validationError) {
                    setDateError(validationError);
                    return;
                  }
                  setDateError("");
                  setShowPaymentModal(true);
                }}
                disabled={!tripDate || !returnDate}
              >
                Continue to Payment
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
              console.error("❌ Order creation error:", error.response?.data || error.message);
              // allow retry on failure only
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