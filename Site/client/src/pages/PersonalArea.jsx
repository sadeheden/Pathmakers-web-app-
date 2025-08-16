import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../assets/styles/PersonalArea.css";

const PersonalArea = () => {
    const [activeTab, setActiveTab] = useState("userInfo");
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState("");
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
    const token = getToken();
    if (!token) {
      console.warn("⚠️ No token found. Redirecting to login...");
      navigate("/login");
      return null;
    }

    const response = await fetch("http://localhost:4000/api/auth/user", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`⚠️ Failed to fetch user, status: ${response.status}`);
    }

    const userData = await response.json();
    const formattedUser = { ...userData, id: userData._id };
    setUser(formattedUser);
    setEditedUser({
      username: userData.username || "",
      email: userData.email || "",
    });
    return formattedUser;
  } catch (error) {
    console.error("⚠️ Error fetching user session:", error);
    navigate("/login");
    return null;
  }
};


    // ✅ Fetch orders function
   // ✅ Fetch orders function (correct)
const fetchOrders = async () => {
  try {
    // be flexible about the token key
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("userToken");

    if (!token) {
      console.error("⚠️ No token found, please log in again.");
      return;
    }

    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // fetch both in parallel (orders from Chat + Traveler-Favorite)
    const [r1, r2] = await Promise.allSettled([
      fetch("http://localhost:4000/api/order",   { method: "GET", headers }),
      fetch("http://localhost:4000/api/orders2", { method: "GET", headers }),
    ]);

    // helper to safely parse
    const parse = async (res) => (res && res.ok) ? await res.json() : null;

    const d1 = await parse(r1.status === "fulfilled" ? r1.value : null);
    const d2 = await parse(r2.status === "fulfilled" ? r2.value : null);

    // normalize shapes from both APIs
    const list1 =
      Array.isArray(d1) ? d1 :
      Array.isArray(d1?.orders) ? d1.orders :
      Array.isArray(d1?.data) ? d1.data : [];

    const list2 =
      Array.isArray(d2) ? d2 :
      Array.isArray(d2?.orders) ? d2.orders :
      Array.isArray(d2?.data?.orders) ? d2.data.orders : [];

    const merged = [...list1, ...list2];

    // dedupe (route + flight/hotel) and keep newest
    const keyOf = (o) => {
      const from  = (o.departure_city_id || o.departureCityId || "").toString();
      const to    = (o.destination_city_id || o.destinationCityId || "").toString();
      const flight = (o.flight_id || o.flightId || o.flight_name || "").toString();
      const hotel  = (o.hotel_id  || o.hotelId  || o.hotel_name  || "").toString();
      return `${from}→${to}::${flight}::${hotel}`;
    };
    const tsOf = (o) =>
      new Date(
        o.created_at || o.createdAt || o.booking_date || o.bookingDate || 0
      ).getTime();

    const map = new Map();
    for (const o of merged) {
      const k = keyOf(o);
      const cur = map.get(k);
      if (!cur || tsOf(o) > tsOf(cur)) map.set(k, o);
    }

    const finalOrders = Array.from(map.values()).sort((a, b) => tsOf(b) - tsOf(a));

    console.log("✅ Merged Orders:", finalOrders);
    setOrders(finalOrders);
  } catch (err) {
    console.error("⚠️ Failed to fetch orders:", err?.message || err);
  }
};

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