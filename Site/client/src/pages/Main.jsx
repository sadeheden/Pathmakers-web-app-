import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../assets/styles/main.css';

// React icons
import { FiCompass, FiHeart, FiMap, FiUsers } from 'react-icons/fi';

// Use your actual images:
import parisImg from '../assets/images/paris.png';
import tokyoImg from '../assets/images/tokyo.png';
import newYorkImg from '../assets/images/newyork.png';
import barcelonaImg from '../assets/images/barcelona.png';
import romeImg from '../assets/images/rome.png';
import londonImg from '../assets/images/london.png';
import bangkokImg from '../assets/images/bangkok.png';
import dubaiImg from '../assets/images/dubai.png';
import fantasyImg from '../assets/images/fantasy.jpg'; 
import airportImg from '../assets/images/airport.jpg';

const cities = [
  { img: parisImg, name: 'Paris', slug: 'paris', flight: 'AF123' },
  { img: tokyoImg, name: 'Tokyo', slug: 'tokyo', flight: 'JL456' },
  { img: newYorkImg, name: 'New York', slug: 'new-york', flight: 'DL789' },
  { img: barcelonaImg, name: 'Barcelona', slug: 'barcelona', flight: 'IB234' },
  { img: romeImg, name: 'Rome', slug: 'rome', flight: 'AZ567' },
  { img: londonImg, name: 'London', slug: 'london', flight: 'BA890' },
  { img: bangkokImg, name: 'Bangkok', slug: 'bangkok', flight: 'TG321' },
  { img: dubaiImg, name: 'Dubai', slug: 'dubai', flight: 'EK654' }
];

const CARDS_PER_PAGE = 6;
const AUTO_ROTATE_SECONDS = 10;

const getPriceByCity = (cityName) => {
  switch(cityName) {
    case 'Paris': return 1800;
    case 'Tokyo': return 2200;
    case 'New York': return 2000;
    case 'Barcelona': return 1700;
    case 'Rome': return 1600;
    case 'London': return 1900;
    case 'Bangkok': return 1500;
    case 'Dubai': return 2100;
    default: return 2000;
  }
};

// ה-PaymentModal שהבאת, עם שינויים קלים להתאמה
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
      onClose();
      onPaymentSuccess();
      // איפוס שדות:
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
            {error && <p className="error-message" style={{whiteSpace: "pre-line"}}>{error}</p>}

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
            <button className="change-payment" onClick={onClose}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
};

const Main = () => {
  const navigate = useNavigate();
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showIntroPopup, setShowIntroPopup] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIdx(idx => (idx + CARDS_PER_PAGE) % cities.length);
    }, AUTO_ROTATE_SECONDS * 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleCities = [
    ...cities,
    ...cities.slice(0, CARDS_PER_PAGE)
  ].slice(carouselIdx, carouselIdx + CARDS_PER_PAGE);

  const tripDate = "2026-03-15";
  const returnDate = "2026-03-22";
  const totalPrice = selectedCity ? getPriceByCity(selectedCity.name) : 0;

  return (
    <div className="trips-page">
      <section className="trip-intro">
        <h1 className="trip-title">Personalize your travel planning with Trips</h1>
        <p className="trip-subtitle">
          With Trips, you get two trip planners in one—use AI to build your trip or build it yourself.
          Either way, there’s more than 8 million spots to discover, with over one billion traveler
          reviews and opinions to guide you.
        </p>
        <div className="trip-icons">
          <div className="icon-block">
            <FiCompass className="icon" />
            <p>Get personalized recs with AI</p>
          </div>
          <div className="icon-block">
            <FiHeart className="icon" />
            <p>Save hotels, restaurants, and more</p>
          </div>
          <div className="icon-block">
            <FiMap className="icon" />
            <p>See your saves on your custom map</p>
          </div>
          <div className="icon-block">
            <FiUsers className="icon" />
            <p>Share and collab with your travel buds</p>
          </div>
        </div>
      </section>
      

      <section className="trip-options">
        <div className="trip-card ai-card">
          <img src={fantasyImg} alt="AI Trip Builder" />
          <h3>Start a trip in minutes with AI</h3>
          <p>
            Answer four short questions and get personalized recs with AI, guided by traveler opinions.
          </p>
          <button onClick={() => navigate('/realChat')}>
            Try AI trip builder
          </button>
        </div>
        <div className="trip-card manual-card">
          <img src={airportImg} alt="Manual Trip Builder" />
          <h3>Build your trip from scratch</h3>
          <p>
            Browse top destinations, restaurants, and things to do and save your faves as you go.
          </p>
          <button onClick={() => navigate('/chat')}>
            Do it yourself
          </button>
        </div>
      </section>

      <section className="popular-trips">
        <h2>Traveler-Favorite Destinations</h2>
        <div className="city-cards">
          {visibleCities.map((city, i) => (
            <div 
              className="city-card" 
              key={i} 
              onClick={() => {
                setSelectedCity(city);
                setPaymentCompleted(false);
                setShowPaymentModal(false);
                setShowIntroPopup(true);
              }} 
              style={{ cursor: 'pointer' }}
            >
              <img src={city.img} alt={city.name} />
              <p>{city.name}</p>
            </div>
          ))}
        </div>
      </section>
{selectedCity && showIntroPopup && (
  <div className="modal-overlay" onClick={() => setShowIntroPopup(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <button
        className="modal-close-x"
        onClick={() => {
          setShowIntroPopup(false);
          setSelectedCity(null);
        }}
        aria-label="Close"
      >
        &#10005;
      </button>

      <h2>You've Selected {selectedCity.name}!</h2>
      <p>
        ✈️ Awesome! You're about to see your trip details to <strong>{selectedCity.name}</strong>.<br/>
        This includes flight number, departure info, and trip dates.
      </p>
      <p>   
        Click <strong>Continue</strong> to review and proceed to payment.
      </p>
      <p><strong>Price per person*</strong></p>
      <button 
        className="modal-payment-btn" 
        onClick={() => setShowIntroPopup(false)}
      >
        Continue
      </button>
    </div>
  </div>
)}

     {selectedCity && !paymentCompleted && !showPaymentModal && !showIntroPopup && (
        <div className="modal-overlay" onClick={() => setSelectedCity(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close-x"
              onClick={() => setSelectedCity(null)}
              aria-label="Close"
            >
              &#10005;
            </button>

            <h2>Your Trip is Ready!</h2>
            <div className="modal-image-wrapper">
              <img
                src={selectedCity.img}
                alt={selectedCity.name}
                className="modal-city-image"
              />
            </div>
            <p><strong>Destination:</strong> {selectedCity.name}</p>
            <p><strong>Departure:</strong> Israel (Ben-Gurion Airport)</p>
            <p><strong>Flight Number:</strong> {selectedCity.flight}</p>
            <p><strong>Trip Date:</strong> {tripDate}</p>
            <p><strong>Return Date:</strong> {returnDate}</p>
            <p><strong>Total Price:</strong> ${totalPrice}</p>

            <div className="modal-btns">
              <button
                className="modal-payment-btn"
                onClick={() => setShowPaymentModal(true)}
              >
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={totalPrice}
    onPaymentSuccess={async () => {
  setPaymentCompleted(true);
  setShowPaymentModal(false);

  // Try different possible token key names
  const token = localStorage.getItem("token") || 
                localStorage.getItem("authToken") || 
                localStorage.getItem("jwt") || 
                localStorage.getItem("access_token") || 
                localStorage.getItem("userToken");
    
  // Check if token exists
  if (!token) {
    console.error("❌ No authentication token found");
    console.log("🔍 Available localStorage keys:", Object.keys(localStorage));
    alert("Please log in to complete your purchase");
    navigate('/login'); // Redirect to login
    return;
  }

  // Check if token is expired (optional)
  const isTokenExpired = (token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (error) {
      return true;
    }
  };

  if (isTokenExpired(token)) {
    console.error("❌ Token has expired");
    alert("Your session has expired. Please log in again.");
    localStorage.removeItem("token");
    navigate('/login');
    return;
  }

  try {
    const response = await axios.post(
      "http://localhost:4000/api/order",
      {
        departureCityId: "ben-gurion",
        destinationCityId: selectedCity.slug,
        flightId: selectedCity.flight,
        hotelId: "default-hotel",
        attractions: [],
        transportation: null,
        paymentMethod: "Credit Card",
        totalPrice: totalPrice,
        tripDate: "2026-03-15"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      }
    );
        
  } catch (error) {
    console.error("❌ Error saving order:", error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      alert("Your session has expired. Please log in again.");
      localStorage.removeItem("token");
      navigate('/login');
    } else {
      alert("Failed to save order. Please try again.");
    }
  }
}}

        />
      )}

      {paymentCompleted && selectedCity && (
        <div className="modal-overlay" onClick={() => setSelectedCity(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close-x"
              onClick={() => {
                setSelectedCity(null);
                setPaymentCompleted(false);
              }}
              aria-label="Close"
            >
              &#10005;
            </button>

            <h2>Payment Successful!</h2>
            <p><strong>Destination:</strong> {selectedCity.name}</p>
            <p><strong>Flight Number:</strong> {selectedCity.flight}</p>
            <p><strong>Trip Date:</strong> {tripDate}</p>      
            <p><strong>Return Date:</strong> {returnDate}</p>
            <p><strong>Total Price:</strong> ${totalPrice}</p>
            <p>Thank you for your purchase! Your trip is confirmed.</p>
            <button onClick={() => {
              setSelectedCity(null);
              setPaymentCompleted(false);
            }}>
              Close
            </button>
          </div>
        </div>
      )}

<button 
  className="floating-support-btn"
  onClick={() => navigate('/support')}
>
  💬 Support
</button>

    </div>
  );
};

export default Main;
