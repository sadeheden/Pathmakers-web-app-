import React from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles//HomePage.css";
import bgVideo from "../assets/images/81945-577442929_small.mp4"; // Ensure correct path

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="hero-container">
      {/* Background Video */}
      <video className="fullscreen-video" playsInline autoPlay muted loop>
        <source src={bgVideo} type="video/mp4" />
      </video>

      {/* Left Dark Overlay for Text */}
      <div className="text-overlay">
        <div className="text-content">
          <h1 className="main-title">Welcome to Pathmakers</h1>
          <p className="description-text">.Travel agency which you'll love</p>
          <div className="action-buttons">
            <button className="action-btn login-button" onClick={() => navigate("/login")}>
              Log in
            </button>
            <button className="action-btn signup-button" onClick={() => navigate("/signup")}>
              Sign up
            </button>
          </div>
        </div>
        <button 
  className="floating-support-btn"
  onClick={() => navigate('/support')}
>
  💬 Support
</button>
      </div>
    </div>
  );
}
