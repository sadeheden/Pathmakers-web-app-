// AboutPage.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/styles/AboutPage.css';


const AboutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || token === "null" || token === "undefined") {
      // Optionally, store the page they tried to visit
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [navigate, location]);
  return (
    <div>
      {/* Page Header */}
      <div className="header-section">
        <h1 className="header-title">About Us</h1>
        <p className="header-sub">
          Discover our mission, values, and commitment to creating seamless travel experiences.
        </p>
      </div>

      {/* Cards Section */}
      <div className="cards-section no-hero">
        <div className="cards-container">
          {/* Card 1 */}
          <div className="card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 className="card-title">Travel</h3>
            <p className="card-text">
              We are a team of creative and innovative individuals dedicated to providing smart and advanced solutions to every challenge.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="7.5,4.21 12,6.81 16.5,4.21"/>
                <polyline points="7.5,19.79 7.5,14.6 3,12"/>
                <polyline points="21,12 16.5,14.6 16.5,19.79"/>
              </svg>
            </div>
            <h3 className="card-title">Benefits</h3>
            <p className="card-text">
              Our platform offers everything you need to plan your trip, including flights, attractions, and hotels. We focus on cutting-edge technology, stunning design, and premium customer service to ensure a seamless experience.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h3 className="card-title">About Us</h3>
            <p className="card-text">
              Committed to enhancing the user experience and offering personalized solutions to each client. Join us on a journey of innovation, creativity, and professionalism.
            </p>
          </div>

          {/* Card 4 */}
          <div className="card">
            <div className="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"/>
              </svg>
            </div>
            <h3 className="card-title">Awards</h3>
            <p className="card-text">
              Recognized globally for outstanding travel experiences and service excellence.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        <a href="#" className="image-credit">
          Book your next adventure with us — we're the best at what we do!
        </a>
      </div>

      {/* Floating Support Button */}
      <button
        className="floating-support-btn"
        onClick={() => navigate('/support')}
        title="Support"
      >
        ?
      </button>
    </div>
  );
};

export default AboutPage;
