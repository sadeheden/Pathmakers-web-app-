import React from "react";
import "../assets/styles/Footer.css"; // Import the CSS file for styling
import "@fortawesome/fontawesome-free/css/all.min.css";

const Footer = () => {
  return (
    <footer className="footer">
        <p>&copy; 2025 PathMakers. All rights reserved.</p>
        <p> Follow us:</p>
        <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="fab fa-facebook-square"></a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="fab fa-instagram"></a>
        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="fab fa-twitter-square"></a>
    </footer>
  );
};

export default Footer;
