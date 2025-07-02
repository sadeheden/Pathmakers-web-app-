import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/Image20250119205452.png";
import profilePlaceholder from "../assets/images/2151100205.jpg";
import "../assets/styles/Header.css";


const Header = () => {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch user session from backend using token stored in localStorage
    const DEFAULT_PROFILE_IMAGE = "https://res.cloudinary.com/YOUR_CLOUDINARY_NAME/image/upload/v1700000000/YOUR_DEFAULT_IMAGE.jpg";

    const fetchUser = async () => {
        const token = localStorage.getItem("authToken");
    
        if (!token) {
            console.warn("⚠️ No token found. Redirecting to login...");
            sessionStorage.removeItem("hasLoggedIn");
            localStorage.removeItem("currentStep");
            localStorage.removeItem("userResponses");
            setUser(null);
            return;
        }
    
        try {
            const response = await fetch("http://localhost:4000/api/auth/user", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
    
            if (!response.ok) {
                throw new Error(`⚠️ Failed to fetch user, status: ${response.status}`);
            }
    
            const userData = await response.json();
            console.log("✅ User fetched successfully:", userData);
    
            // ✅ If no profile image exists, set the default one
            if (!userData.profileImage || userData.profileImage === "null") {
                userData.profileImage = DEFAULT_PROFILE_IMAGE;
            }
    
            setUser(userData);
        } catch (error) {
            console.error("⚠️ Error fetching user session:", error);
        }
    };
    
    
    const fetchOrders = async () => {
        const token = localStorage.getItem("authToken");
        
        if (!token) {
            console.warn("⚠️ No token found, user is not logged in.");
            return;
        }
    
        try {
            const response = await fetch("http://localhost:4000/api/order", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
    
            if (!response.ok) {
                console.warn("⚠️ Error fetching orders:", response.status);
                return;
            }
    
            const orders = await response.json();
            console.log("✅ User orders:", orders);
            setOrders(orders);
        } catch (error) {
            console.error("⚠️ Error fetching orders:", error);
        }
    };
    
    // Ensure the user is fetched on page load
    useEffect(() => {
        fetchUser();
    }, [location]);

    // Handle logout
    const handleLogout = async () => {
        const token = localStorage.getItem("authToken");
    
        try {
            const response = await fetch("http://localhost:4000/api/auth/logout", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
    
            if (!response.ok) throw new Error(`Logout failed: ${response.statusText}`);
    
            console.log("✅ Successfully logged out.");
            localStorage.removeItem("authToken");
            sessionStorage.removeItem("hasLoggedIn"); // ✅ Clear session
            localStorage.removeItem("currentStep"); // ✅ Clear chat history
            localStorage.removeItem("userResponses"); // ✅ Clear chat history
            setUser(null);
            navigate("/login"); // Redirect to login
        } catch (error) {
            console.error("⚠️ Logout error:", error);
        }
    };
    

    // Define pages to disable the menu
    const disabledPages = ["/", "/signup", "/login"];
    const isDisabledPage = disabledPages.includes(location.pathname);

    return (
        <header className="header">
            {/* Logo and Navbar */}
            <div className="logo">
                <Link to={isDisabledPage ? "#" : "/main"} className={isDisabledPage ? "disabled-link" : ""}>
                    <img src={logo} alt="Logo" />
                </Link>
            </div>

            {!isDisabledPage && user && (
                <nav className={`navbar ${isMenuOpen ? "show" : ""}`}>
                    <Link to="/main">Main</Link>
                    <Link to="/about">About</Link>
                    <Link to="/video">Video</Link>
                    <Link to="/DownloadApp">Download App</Link>
                </nav>
            )}

            <div className="profile-section">
                {user ? (
                    <>
                      <img
    src={user?.profileImage || profilePlaceholder}
    alt="User"
    className="profile-image"
    onClick={() => setIsProfileOpen(!isProfileOpen)}
/>

                        {isProfileOpen && (
                            <div className="profile-popup">
                                <p>Hello, {user.username}!</p>
                                <Link to="/personal-area">Go to Profile</Link>
                                <button onClick={handleLogout} className="logoutButton">
                                    Log Out
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <Link to="/login" className="login-button">
                        <span className="icon">🙈</span> 
                    </Link>
                )}
            </div>

            {!isDisabledPage && user && (
                <button
                    className={`hamburger ${isMenuOpen ? "active" : ""}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className="line"></span>
                    <span className="line"></span>
                    <span className="line"></span>
                </button>
            )}
        </header>
    );
};

export default Header;
