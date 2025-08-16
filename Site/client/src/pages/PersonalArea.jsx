import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/PersonalArea.css";

const PersonalArea = () => {
    const [activeTab, setActiveTab] = useState("userInfo");
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
    const [showUniqueOnly, setShowUniqueOnly] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState({
        username: "",
        email: "",
    });
    const [orders, setOrders] = useState([]);
    const navigate = useNavigate();
    
    // ✅ Fetch user data function
    const fetchUser = async () => {
        try {
            const token = localStorage.getItem("authToken");
            if (!token) {
                console.warn("⚠️ No token found. Redirecting to login...");
                navigate("/login");
                return null;
            }

            const response = await fetch("http://localhost:4000/api/auth/user", {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`⚠️ Failed to fetch user, status: ${response.status}`);
            }

            const userData = await response.json();
            console.log("✅ User data received:", userData);
            
            const formattedUser = { ...userData, id: userData._id };
            setUser(formattedUser);
            setEditedUser({
                username: userData.username || "",
                email: userData.email || ""
            });

            return formattedUser;
        } catch (error) {
            console.error("⚠️ Error fetching user session:", error);
            return null;
        }
    };


// Updated fetchOrders function
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
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Orders received from API:", data);

    // Normalize possible shapes
    let ordersArray = [];
    if (Array.isArray(data)) {
      ordersArray = data;
    } else if (Array.isArray(data?.orders)) {
      ordersArray = data.orders;
    } else if (Array.isArray(data?.data)) {
      ordersArray = data.data;
    }

    // Sort by creation date (newest first)
    const sortedOrders = ordersArray.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt);
      const dateB = new Date(b.created_at || b.createdAt);
      return dateB - dateA;
    });

    console.log("✅ All Orders:", sortedOrders);
    console.log("✅ Total orders count:", sortedOrders.length);
    setOrders(sortedOrders);
    
  } catch (error) {
    console.error("⚠️ Failed to fetch orders:", error.message);
  }
};

// Function to get filtered orders
const getFilteredOrders = () => {
  if (!showUniqueOnly) {
    return orders; // Show all orders
  }

  // Show only unique routes (most recent per route)
  const uniqueOrdersMap = new Map();
  orders.forEach(order => {
    const key = `${order.departure_city_id}-${order.destination_city_id}`;
    const current = uniqueOrdersMap.get(key);
    const existingDate = current ? new Date(current.created_at || current.createdAt) : 0;
    const incomingDate = new Date(order.created_at || order.createdAt);
    if (!current || existingDate < incomingDate) {
      uniqueOrdersMap.set(key, order);
    }
  });

  return Array.from(uniqueOrdersMap.values());
};

// Replace your orders section JSX with this:
{/* User Orders */}
{activeTab === "orders" && (
  <>
    <h2 className="heading">Your Previous Orders</h2>
    
    {/* Filter Toggle */}
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="checkbox"
          checked={showUniqueOnly}
          onChange={(e) => setShowUniqueOnly(e.target.checked)}
        />
        Show only latest order per route
      </label>
      <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
        Total orders: {orders.length} | 
        Showing: {getFilteredOrders().length}
      </small>
    </div>

    {getFilteredOrders().length > 0 ? (
      <ul className="orders-list">
        {getFilteredOrders().map((order, index) => (
          <li key={order._id || order.id || index} className="order-item">
            <strong>Route:</strong>{" "}
            {order.departure_city_name || order.departure_city_id} → {order.destination_city_name || order.destination_city_id}
            , ${Number(order.total_price || 0).toLocaleString()}
            <small style={{ display: 'block', color: '#666' }}>
              {new Date(order.created_at || order.createdAt).toLocaleDateString()}
            </small>
            <button className="view-details-button" onClick={() => handleViewOrderDetails(order)}>
              View Details
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <div>
        <p>No previous orders found.</p>
      </div>
    )}
  </>
)}

    // ✅ Initial data fetch
    useEffect(() => {
        const initializeData = async () => {
            console.log("🔄 Initializing user data...");
            const userData = await fetchUser();
            
            // Only fetch orders if user data was successfully retrieved
            if (userData && userData.id) {
                console.log("🔍 Fetching orders for user:", userData.id);
                await fetchOrders();
            }
        };

        initializeData();
    }, []); // Run only once on component mount

    const handleEditProfile = () => {
        setIsEditing(true);
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

    const handleSaveProfile = async () => {
        setLoading(true);
        const token = localStorage.getItem("authToken");

        const updatedData = {
            username: editedUser.username,
            email: editedUser.email,
        };

        if (editedUser.birthdate) {
            updatedData.age = calculateAge(editedUser.birthdate);
        }

        console.log("🔍 Sending update:", updatedData);

        try {
            const response = await fetch("http://localhost:4000/api/auth/user", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();
            console.log("🔍 Server response:", result);

            if (response.ok) {
                setUser(result);
                setEditedUser(result);
                setIsEditing(false);
                console.log("✅ Profile updated successfully.");
            } else {
                console.error("⚠️ Failed to update profile:", result);
                alert("⚠️ Error updating profile: " + (result.message || "Please try again."));
            }
        } catch (error) {
            console.error("⚠️ Error updating profile:", error);
            alert("⚠️ An error occurred. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrderDetails = (order) => {
        setSelectedOrder(order);
    };

    const handleLogout = () => {
        localStorage.removeItem("authToken"); // ✅ Fixed token key
        setUser(null);
        navigate("/login");
    };

    const handleSubscribe = async () => {
        if (!email.trim()) {
            alert("⚠️ Please enter a valid email.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("http://localhost:4000/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                alert("✅ Subscription successful, check your inbox!");
                setEmail("");
            } else {
                const errorData = await response.json();
                console.error("⚠️ Failed to subscribe:", errorData.message || response.status);
                alert("⚠️ Failed to subscribe. " + (errorData.message || "Please try again."));
            }
        } catch (error) {
            console.error("⚠️ Error during subscription:", error);
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
                {/* User Information */}
                {activeTab === "userInfo" && (
                    <>
                        <h2 className="heading">User Details</h2>
                        <div className="profileInfo">
                            {user ? (
                                <>
                                    <p><strong>Username:</strong> {user.username}</p>
                                    <p><strong>Email:</strong> {user.email}</p>
                                </>
                            ) : (
                                <div>
                                    <p>Loading user data...</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Order Details Modal */}
                {selectedOrder && (
                    <div className="order-modal">
                        <div className="order-modal-content">
                            <button className="close-modal" onClick={() => setSelectedOrder(null)}>✖</button>
                            <h2>Order Details</h2>

                            <p><strong>Order ID:</strong> {selectedOrder._id || selectedOrder.id}</p>
                            <p><strong>Departure City:</strong> {selectedOrder.departure_city_name || selectedOrder.departure_city_id}</p>
                            <p><strong>Destination City:</strong> {selectedOrder.destination_city_name || selectedOrder.destination_city_id}</p>
                            
                            <p><strong>Flight:</strong> {selectedOrder.flight_name || selectedOrder.flight_id || "Not selected"}</p>
                            <p><strong>Hotel:</strong> {selectedOrder.hotel_name || selectedOrder.hotel_id || "Not selected"}</p>

                            <p><strong>Attractions:</strong> 
                                {Array.isArray(selectedOrder.attraction_names) && selectedOrder.attraction_names.length > 0
                                    ? selectedOrder.attraction_names.join(", ")
                                    : "None"}
                            </p>

                            <p><strong>Transportation:</strong> {selectedOrder.transportation || "Not selected"}</p>
                            <p><strong>Payment Method:</strong> {selectedOrder.payment_method}</p>
                            <p><strong>Total Price:</strong> ${Number(selectedOrder.total_price || 0).toLocaleString()}</p>
                            <p><strong>Created At:</strong> {new Date(selectedOrder.created_at || selectedOrder.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                )}

                {/* User Orders */}
                {activeTab === "orders" && (
                    <>
                        <h2 className="heading">Your Previous Orders</h2>
                        {orders && orders.length > 0 ? (
                            <ul className="orders-list">
                                {orders.map((order, index) => (
                                    <li key={order._id || order.id || index} className="order-item">
                                        <strong>Route:</strong>{" "}
                                        {order.departure_city_name || order.departure_city_id} → {order.destination_city_name || order.destination_city_id}
                                        , ${Number(order.total_price || 0).toLocaleString()}
                                        <button className="view-details-button" onClick={() => handleViewOrderDetails(order)}>
                                            View Details
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div>
                                <p>No previous orders found.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Newsletter Subscription */}
                {activeTab === "newsletter" && (
                    <>
                        <h2 className="heading">Sign Up for Newsletter</h2>
                        <div className="profileInfo">
                            <p>Get the latest updates and travel deals straight to your inbox!</p>
                        </div>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="newsletter-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <button onClick={handleSubscribe} className="newsletter-button" disabled={loading}>
                            {loading ? "Subscribing..." : "Subscribe"}
                        </button>
                    </>
                )}
            </div>
            
  <button 
  className="floating-support-btn"
  onClick={() => navigate('/support')}
>
  ❔
</button>

        </div>
    );   
};

export default PersonalArea;