import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/PersonalArea.css";

const PersonalArea = () => {
    const [activeTab, setActiveTab] = useState("userInfo");
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [pdfUrl, setPdfUrl] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState({
        username: "",
        birthdate: "",
        address: "",
        city: "",
        country: "",
        phone: "",
        gender: "Other",
        membership: "No",
    });

    const [orders, setOrders] = useState([]);
    const navigate = useNavigate();

    const fetchOrders = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                console.error("⚠️ No token found, please log in again.");
                return;
            }

            const response = await fetch("http://localhost:4000/api/order", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Orders received from API:", data);

            const uniqueOrdersMap = new Map();
            data.forEach(order => {
                const key = `${order.departureCity}-${order.destinationCity}`;
                if (!uniqueOrdersMap.has(key) || uniqueOrdersMap.get(key).createdAt < order.createdAt) {
                    uniqueOrdersMap.set(key, order);
                }
            });

            const uniqueOrders = Array.from(uniqueOrdersMap.values());
            console.log("✅ Unique Orders:", uniqueOrders);

            setOrders(uniqueOrders);
        } catch (error) {
            console.error("⚠️ Failed to fetch orders:", error.message);
        }
    };

    useEffect(() => {
        if (user && user.id) {
            fetchOrders();
        }
    }, [user]);

    const fetchUser = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                navigate("/login");
                return;
            }

            const response = await fetch("http://localhost:4000/api/info/user", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`⚠️ Failed to fetch user, status: ${response.status}`);
            }

            const userData = await response.json();
            console.log("✅ User fetched successfully:", userData);

            setUser(userData);

            setEditedUser({
                username: userData.username || "",
                birthdate: userData.birthdate || "",
                address: userData.address || "",
                city: userData.city || "",
                country: userData.country || "",
                phone: userData.phone || "",
                gender: userData.gender || "Other",
                membership: userData.membership || "No",
                age: userData.birthdate ? calculateAge(userData.birthdate) : "Not provided",
            });

        } catch (error) {
            console.error("⚠️ Error fetching user session:", error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                navigate("/login");
                return;
            }

            await fetchUser();

            setTimeout(() => {
                fetchOrders();
            }, 500);
        };
        fetchData();
    }, []);

    const handleEditProfile = () => {
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const updatedData = { ...editedUser };

        if (editedUser.birthdate) {
            updatedData.age = calculateAge(editedUser.birthdate);
        }

        try {
            const response = await fetch("http://localhost:4000/api/info/user", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();

            if (response.ok) {
                setUser(result);
                setEditedUser(result);
                setIsEditing(false);
            } else {
                alert("⚠️ Error updating profile: " + (result.message || "Please try again."));
            }
        } catch (error) {
            alert("⚠️ An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrderDetails = (order) => {
        setSelectedOrder(order);
    };

    const calculateAge = (birthdate) => {
        if (!birthdate) return "Not provided";
        const birthDateObj = new Date(birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
            age--;
        }
        return age;
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/login");
    };

    const handleSubscribe = async () => {
        // ✅ חדש: משתמש במייל של המשתמש ולא מהקלט
        if (!user || !user.email) {
            alert("⚠️ User email not found. Please log in again.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("http://localhost:4000/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user.email }) // ✅ חדש
            });
            if (response.ok) {
                alert("✅ Subscription successful, check your inbox!");
                setEmail("");
            } else {
                const errorData = await response.json();
                alert("⚠️ Failed to subscribe. " + (errorData.message || "Please try again."));
            }
        } catch (error) {
            alert("⚠️ An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1 className="page-title">Personal Area</h1>
            <div className="tab-buttons">
                <button onClick={() => setActiveTab("userInfo")} className={activeTab === "userInfo" ? "active" : ""}>
                    User Info
                </button>
                <button onClick={() => setActiveTab("orders")} className={activeTab === "orders" ? "active" : ""}>
                    Previous Orders
                </button>
                <button onClick={() => setActiveTab("newsletter")} className={activeTab === "newsletter" ? "active" : ""}>
                    Sign Up for Newsletter
                </button>
            </div>

            <div className="containerPersonal">
                {activeTab === "userInfo" && (
                    <>
                        <h2 className="heading">User Details</h2>
                        <div className="profileInfo">
                            {user ? (
                                <>
                                    {isEditing ? (
                                        <>
                                            <label>Membership</label>
                                            <div className="membership-options">
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="membership"
                                                        value="Yes"
                                                        checked={editedUser.membership === "Yes"}
                                                        onChange={(e) =>
                                                            setEditedUser({ ...editedUser, membership: e.target.value })
                                                        }
                                                    />
                                                    Yes
                                                </label>
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="membership"
                                                        value="No"
                                                        checked={editedUser.membership === "No"}
                                                        onChange={(e) =>
                                                            setEditedUser({ ...editedUser, membership: e.target.value })
                                                        }
                                                    />
                                                    No
                                                </label>
                                            </div>
                                            <button onClick={handleSaveProfile} className="button">Save</button>
                                        </>
                                    ) : (
                                        <>
                                            <p><strong>Membership:</strong> {user.membership === "Yes" ? "✅ Yes" : "❌ No"}</p>
                                            <button onClick={handleEditProfile} className="button">Edit Profile</button>
                                        </>
                                    )}
                                </>
                            ) : (
                                <p>Please log in to see your details.</p>
                            )}
                        </div>
                    </>
                )}

                {selectedOrder && (
                    <div className="order-modal">
                        <div className="order-modal-content">
                            <button className="close-modal" onClick={() => setSelectedOrder(null)}>✖</button>
                            <h2>Order Details</h2>
                            <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                            <p><strong>Departure:</strong> {selectedOrder.departureCity}</p>
                            <p><strong>Destination:</strong> {selectedOrder.destinationCity}</p>
                            <p><strong>Total Price:</strong> ${selectedOrder.totalPrice}</p>
                        </div>
                    </div>
                )}

                {activeTab === "orders" && (
                    <>
                        <h2 className="heading">Your Previous Orders</h2>
                        {orders && orders.length > 0 ? (
                            <ul className="orders-list">
                                {orders.map((order, index) => (
                                    <li key={index} className="order-item">
                                        <strong>Route:</strong> {order.departureCity} → {order.destinationCity}, ${order.totalPrice}
                                        <button className="view-details-button" onClick={() => handleViewOrderDetails(order)}>
                                            View Details
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No previous orders found.</p>
                        )}
                    </>
                )}

                {activeTab === "newsletter" && (
                    <>
                        <h2 className="heading">Sign Up for Newsletter</h2>
                        <div className="profileInfo">
                            <p>Get the latest updates and travel deals straight to your inbox!</p>
                        </div>

                        {/* ✅ אימייל מהמשתמש – ללא עריכה */}
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="newsletter-input"
                            value={user?.email || ""}
                            readOnly // ✅ חדש
                        />
                        <button onClick={handleSubscribe} className="newsletter-button" disabled={loading}>
                            {loading ? "Subscribing..." : "Subscribe"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default PersonalArea;
