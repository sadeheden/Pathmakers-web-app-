import React from "react";
import "../assets/styles/Footer.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-left">
          <span className="footer-logo">PathMakers</span>
          <span className="footer-copy">&copy; 2025 All rights reserved.</span>
        </div>
        <div className="footer-right">
          <span className="footer-follow">Follow us:</span>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <i className="fab fa-facebook-square"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
            <i className="fab fa-twitter-square"></i>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
