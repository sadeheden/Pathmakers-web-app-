import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo from "../assets/images/Image20250119205452.png";
import "../assets/styles/Header.css";

const DEFAULT_PROFILE_IMAGE = "https://res.cloudinary.com/dnnmhrsja/image/upload/v1741780893/user_profiles/may.jpg";


const Header = () => {
    const [user, setUser] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch user session from backend using token stored in localStorage
    const fetchUser = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            setUser(null);
            
            return;
        }
        try {
            const res = await fetch("http://localhost:4000/api/auth/user", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            if (!res.ok) {
                const err = await res.text();
                console.error("⚠️ Backend error:", err);
                throw new Error(`⚠️ Failed to fetch user, status: ${res.status}`);
            }
            const userData = await res.json();
            console.log("userData from backend:", userData);

            // Use profile_image from backend, fall back to Cloudinary/default/local placeholder if missing
            userData.profile_image = userData.profile_image && userData.profile_image !== "null"
                ? userData.profile_image
                : DEFAULT_PROFILE_IMAGE;
            setUser(userData);
        } catch (error) {
            setUser(null);
            console.error("⚠️ Error fetching user session:", error);
        }
    };

    // Call fetchUser once on mount
  // Listen for "userChanged" events (after login/register)
useEffect(() => {
    fetchUser(); // Call it immediately on mount

    const handleUserChange = () => {
        fetchUser();
    };

    window.addEventListener("userChanged", handleUserChange);
    return () => {
        window.removeEventListener("userChanged", handleUserChange);
    };
}, []);


    // Handle logout
// Handle logout
const handleLogout = async () => {
  const token = localStorage.getItem("authToken");
  try {
    const response = await fetch("http://localhost:4000/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(`Logout failed: ${response.statusText}`);

    // 🧹 clear ALL chat/order memory
    localStorage.removeItem("currentStep");
    localStorage.removeItem("userResponses");
    sessionStorage.removeItem("orderSaved");
    sessionStorage.removeItem("lastOrderId");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("hasLoggedIn");

    // notify both Header and Chat
    window.dispatchEvent(new Event("userChanged"));
    window.dispatchEvent(new Event("app:logout")); // 👈 added


     localStorage.setItem("app:logout", String(Date.now()));
    navigate("/login", { replace: true });
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
          <div className="logo" onClick={() => navigate(user ? "/main" : "/login")}>
  <img src={logo} alt="Logo" style={{ cursor: "pointer" }} />
</div>


            {!isDisabledPage && user && (
                <nav className={`navbar ${isMenuOpen ? "show" : ""}`}>
                    <Link to="/main">Main</Link>
                    <Link to="/about">About</Link>
                    <Link to="/video">Video</Link>
                    <Link to="/DownloadApp">Download App</Link>
                     {/* רק אם המשתמש הוא מנהל */}
                    {user?.isAdmin && <Link to="/manager">Manager</Link>}
                </nav>
            )}

            <div className="profile-section">
                {user ? (
                    <>
                       <img
  src={user.profile_image}
  alt="User"
  className="profile-image"
  onClick={() => setIsProfileOpen(!isProfileOpen)}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = DEFAULT_PROFILE_IMAGE;
  }}
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
