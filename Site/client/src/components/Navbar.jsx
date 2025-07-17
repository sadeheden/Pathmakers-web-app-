import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ user }) {
    return (
        <nav className="navbar">
            <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/chat">Chat AI</Link></li>
                <li><Link to="/personal-area">Personal Area</Link></li>
                <li><Link to="/video">Video</Link></li>
                <li><Link to="/main">Main</Link></li>
                <li><Link to="/DownloadApp">Download App</Link></li>
                <li><Link to="/signup">Signup</Link></li>

                {/* קישור לעמוד מנהל - רק אם המשתמש הוא מנהל */}
                {user?.isAdmin && (
                    <li><Link to="/manager">Manager</Link></li>
                )}
            </ul>
        </nav>
    );
}
