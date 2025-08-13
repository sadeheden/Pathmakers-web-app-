import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import "../assets/styles/manager.css";

const sidebarItems = [
  "Dashboard",
  "Trips",
  "Manage Data",
  "Message support",
];

const styles = {
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "28px",
    maxWidth: "1000px",
    width: "100%",
    backgroundColor: "#fff",
    boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
    marginTop: "16px",
  },
  header: { marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center" },
  label: { fontWeight: 700, minWidth: 160, fontSize: 16 },
  select: { padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", width: "100%", fontSize: 16 },
  form: {
    marginBottom: "20px",
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "1fr 1fr 1fr",
  },
  input: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    width: "100%",
    fontSize: 16,
  },
  textarea: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    minHeight: 120,
    gridColumn: "1 / -1",
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    padding: "14px 22px",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    width: "220px",
    fontWeight: 800,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#10b981",
    color: "#fff",
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    marginTop: "10px",
  },
  removeBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 12,
    marginLeft: "10px",
  },
  gridWrap: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    maxWidth: 800,
    marginTop: 16,
  },
  card: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "18px 20px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .12s ease",
  },
  cardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 22px rgba(0,0,0,0.10)" },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 18,
    color: "#fff",
  },
  cardBody: { display: "flex", flexDirection: "column" },
  cardTitle: { fontWeight: 800, lineHeight: 1.2, fontSize: 16 },
  cardDesc: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  stepHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  backBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
  successChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#ecfdf5",
    color: "#065f46",
    border: "1px solid #a7f3d0",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 14,
  },
  hotelItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "10px",
  },
  attractionItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "10px",
  },
};

const Manager = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [successMessage, setSuccessMessage] = useState("");
  
  const [dashboardData, setDashboardData] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    topDestinations: [],
    revenueByDate: [],
  });

  useEffect(() => {
    if (activeItem === "Dashboard") {
      fetch("http://localhost:4000/api/manager/dashboard")
        .then((res) => res.json())
        .then((data) => {
          console.log("📊 Dashboard API data:", data);
          setDashboardData({
            totalOrders: data.totalOrders || 0,
            totalRevenue: data.totalRevenue || 0,
            topDestinations: data.topDestinations || [],
            ordersByDate: data.ordersByDate || [],
            revenueByDate: data.revenueByDate || [],
            revenueByMonth: data.revenueByMonth || [],
          });
        })
        .catch((err) => console.error("Error loading dashboard data:", err));
    }
  }, [activeItem]);

  // UpdateCity component
  const UpdateCity = () => {
    const [searchCity, setSearchCity] = useState("");
    const [cityData, setCityData] = useState(null);
    const [newAttractions, setNewAttractions] = useState([{ name: "", openingHours: "", price: "" }]);
    const [newHotels, setNewHotels] = useState([{ name: "", price: "" }]);
    const [newFlights, setNewFlights] = useState([{ name: "", price: "", duration: "" }]);

    const fetchCityData = async () => {
      if (!searchCity) {
        alert("Please enter a city name");
        return;
      }

      try {
        const response = await fetch(`http://localhost:4000/api/cities/name/${encodeURIComponent(searchCity)}`);
        let data;

        if (response.ok) {
          data = await response.json();
          console.log("✅ Loaded existing city data:", data);
        } else if (response.status === 404) {
          const createResponse = await fetch("http://localhost:4000/api/cities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: searchCity }),
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || "Failed to create new city");
          }

          data = await createResponse.json();
          alert(`✅ City '${searchCity}' created successfully`);
          console.log("🆕 Created new city data:", data);
          
          data.attractions = [];
          data.hotels = [];
          data.flights = [];
        } else {
          throw new Error(`Failed to fetch city. Status: ${response.status}`);
        }

        setCityData(data);
        setNewAttractions([{ name: "", openingHours: "", price: "" }]);
        setNewHotels([{ name: "", price: "" }]);
        setNewFlights([{ name: "", price: "", duration: "" }]);

      } catch (err) {
        console.error("Fetch error:", err);
        alert(`Error: ${err.message}`);
        setCityData(null);
      }
    };

    return (
      <div className="update-city-container">
        <h1>Update City Data</h1>
        <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Enter city name"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            style={{ padding: "10px", fontSize: "16px", borderRadius: "8px", border: "1px solid #ccc" }}
          />
          <button 
            onClick={fetchCityData}
            style={{ 
              padding: "10px 20px", 
              fontSize: "16px", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "8px", 
              cursor: "pointer" 
            }}
          >
            Load City Data
          </button>
        </div>
        
        {cityData && (
          <>
            <h2 style={{ color: "#333", marginBottom: "20px" }}>
              Current Data for {cityData.city} (ID: {cityData._id})
            </h2>
            
            <div style={{ backgroundColor: "#f8f9fa", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
              <h3>Hotels ({cityData.hotels?.length || 0})</h3>
              {cityData.hotels?.length > 0 ? (
                <ul>
                  {cityData.hotels.map((h, i) => (
                    <li key={i}>{h.name} - ${h.price}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#666" }}>No hotels added yet</p>
              )}

              <h3>Attractions ({cityData.attractions?.length || 0})</h3>
              {cityData.attractions?.length > 0 ? (
                <ul>
                  {cityData.attractions.map((a, i) => (
                    <li key={i}>{a.name} - {a.openingHours} - ${a.price}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#666" }}>No attractions added yet</p>
              )}

              <h3>Flights ({cityData.flights?.length || 0})</h3>
              {cityData.flights?.length > 0 ? (
                <ul>
                  {cityData.flights.map((f, i) => (
                    <li key={i}>{f.name} - ${f.price} - {f.duration}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#666" }}>No flights added yet</p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // ✅ ManageDataUpdateBox - תמיכה במערכי מלונות ואטרקציות
  function ManageDataUpdateBox() {
    const [step, setStep] = useState("choose");
    const [collection, setCollection] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [formData, setFormData] = useState({
      cityName: "",
      city: "",
      hotels: [{ name: "", price: "" }], // מערך מלונות
      attractions: [{ name: "", openingHours: "", price: "" }], // מערך אטרקציות
      flightName: "", 
      flightPrice: "", 
      flightDuration: "",
    });

    const pick = (key) => {
      setCollection(key);
      setSaved(false);
      setStep("form");
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      console.log("handleChange:", name, value);
      setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // טיפול בשינוי מלון ספציפי
    const handleHotelChange = (index, field, value) => {
      const newHotels = [...formData.hotels];
      newHotels[index][field] = value;
      setFormData(prev => ({ ...prev, hotels: newHotels }));
    };

    // הוספת מלון חדש
    const addHotel = () => {
      setFormData(prev => ({
        ...prev,
        hotels: [...prev.hotels, { name: "", price: "" }]
      }));
    };

    // הסרת מלון
    const removeHotel = (index) => {
      if (formData.hotels.length > 1) {
        const newHotels = formData.hotels.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, hotels: newHotels }));
      }
    };

    // טיפול בשינוי אטרקציה ספציפית
    const handleAttractionChange = (index, field, value) => {
      const newAttractions = [...formData.attractions];
      newAttractions[index][field] = value;
      setFormData(prev => ({ ...prev, attractions: newAttractions }));
    };

    // הוספת אטרקציה חדשה
    const addAttraction = () => {
      setFormData(prev => ({
        ...prev,
        attractions: [...prev.attractions, { name: "", openingHours: "", price: "" }]
      }));
    };

    // הסרת אטרקציה
    const removeAttraction = (index) => {
      if (formData.attractions.length > 1) {
        const newAttractions = formData.attractions.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, attractions: newAttractions }));
      }
    };

    const handleBack = () => {
      setFormData({
        cityName: "",
        city: "",
        hotels: [{ name: "", price: "" }],
        attractions: [{ name: "", openingHours: "", price: "" }],
        flightName: "", 
        flightPrice: "", 
        flightDuration: "",
      });
      setCollection(null);
      setStep("choose");
    };

    const handleSave = async () => {
      try {
        setSaving(true);
        let url = "";
        let payload = {};

        switch (collection) {
          case "cities":
            if (!formData.cityName) throw new Error("City name is required");
            url = "http://localhost:4000/api/cities";
            payload = { city: formData.cityName.trim() };
            break;

          case "hotels":
            if (!formData.city) throw new Error("City is required");
            
            // בדיקה שיש לפחות מלון אחד עם נתונים
            const validHotels = formData.hotels.filter(h => h.name.trim() && h.price);
            if (validHotels.length === 0) {
              throw new Error("At least one hotel with name and price is required");
            }

            url = "http://localhost:4000/api/cities/add-hotels";
            payload = {
              city: formData.city.trim(),
              hotels: validHotels.map(h => ({
                name: h.name.trim(),
                price: parseFloat(h.price)
              }))
            };
            break;

         case "attractions":
          if (!formData.city) throw new Error("City is required");

          // בדיקה שיש לפחות אטרקציה אחת עם כל הפרטים
          const validAttractions = formData.attractions.filter(
            a => a.name?.trim() && a.openingHours?.trim() && a.price != null
          );

          if (validAttractions.length === 0) {
            throw new Error("At least one attraction with all details is required");
          }

          url = "http://localhost:4000/api/cities/add-attractions";
          payload = {
            city: formData.city.trim(),
            attractions: validAttractions.map(a => ({
              name: a.name.trim(),
              openingHours: a.openingHours.trim(),
              price: parseFloat(a.price)
            }))
          };
          break;
case "flights":
  if (!formData.city) throw new Error("City is required");

  // ודא שהמערך קיים
  const flightsArray = formData.flights || [];

  // בדיקה שיש לפחות טיסה אחת עם כל הפרטים
  const validFlights = flightsArray.filter(
    f => f.name?.trim() && f.price != null && f.duration?.trim()
  );

  if (validFlights.length === 0) {
    throw new Error("At least one flight with all details is required");
  }

  url = "http://localhost:4000/api/cities/add-flights";
  payload = {
    city: formData.city.trim(),
    flights: validFlights.map(f => ({
      name: f.name.trim(),
      price: parseFloat(f.price),
      duration: f.duration.trim()
    }))
  };
  break;


          default:
            throw new Error("Pick a collection to update");
        }

        console.log("Sending payload:", payload);
        
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("Server response:", data);
        
        if (!res.ok) throw new Error(data?.message || data?.error || "Failed to save");

        setSaved(true);
        setSaving(false);
        setTimeout(() => {
          setSaved(false);
          handleBack();
        }, 1400);
      } catch (err) {
        setSaving(false);
        alert(err.message);
      }
    };

    // Step 1 — choose collection
    if (step === "choose") {
      return (
        <div style={styles.box}>
          <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>What would you like to update?</h3>
            {saved && <div style={styles.successChip}>✓ Saved</div>}
          </div>

          <div style={styles.gridWrap}>
            <div
              style={styles.card}
              onClick={() => pick("cities")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#60a5fa,#2563eb)" }}>C</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Cities</div>
                <div style={styles.cardDesc}>Add a new city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("hotels")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#34d399,#059669)" }}>H</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Hotels</div>
                <div style={styles.cardDesc}>Add multiple hotels to a city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("attractions")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#f472b6,#db2777)" }}>A</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Attractions</div>
                <div style={styles.cardDesc}>Add multiple attractions to a city</div>
              </div>
            </div>

            <div
              style={styles.card}
              onClick={() => pick("flights")}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.cardHover)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = styles.card.boxShadow;
              }}
            >
              <div style={{ ...styles.cardIcon, background: "linear-gradient(135deg,#a78bfa,#7c3aed)" }}>F</div>
              <div style={styles.cardBody}>
                <div style={styles.cardTitle}>Flights</div>
                <div style={styles.cardDesc}>Add a flight (name, city, price, duration)</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Step 2 — form for the chosen collection
    return (
      <div style={styles.box}>
        <div style={styles.stepHeader}>
          <button style={styles.backBtn} onClick={handleBack}>← Back</button>
          {saved && <div style={styles.successChip}>✓ Saved</div>}
        </div>

        <div style={{ marginBottom: 16, fontWeight: 700, fontSize: 18 }}>
          Update: {collection?.[0].toUpperCase() + collection?.slice(1)}
        </div>

        {collection === "cities" && (
          <div style={styles.form}>
            <input 
              name="cityName" 
              placeholder="City name" 
              style={styles.input}
              value={formData.cityName} 
              onChange={handleChange} 
            />        
          </div>
        )}

        {collection === "hotels" && (
          <div>
            <div style={styles.form}>
              <input 
                name="city" 
                placeholder="City name" 
                style={{ ...styles.input, gridColumn: "1 / -1" }}
                value={formData.city} 
                onChange={handleChange} 
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Hotels:</h4>
              {formData.hotels.map((hotel, index) => (
                <div key={index} style={styles.hotelItem}>
                  <input
                    placeholder="Hotel name"
                    value={hotel.name}
                    onChange={(e) => handleHotelChange(index, 'name', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={hotel.price}
                    onChange={(e) => handleHotelChange(index, 'price', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  {formData.hotels.length > 1 && (
                    <button
                      onClick={() => removeHotel(index)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addHotel} style={styles.addBtn}>
                + Add Another Hotel
              </button>
            </div>
          </div>
        )}

        {collection === "attractions" && (
          <div>
            <div style={styles.form}>
              <input 
                name="city" 
                placeholder="City name" 
                style={{ ...styles.input, gridColumn: "1 / -1" }}
                value={formData.city} 
                onChange={handleChange} 
              />
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Attractions:</h4>
              {formData.attractions.map((attraction, index) => (
                <div key={index} style={styles.attractionItem}>
                  <input
                    placeholder="Attraction name"
                    value={attraction.name}
                    onChange={(e) => handleAttractionChange(index, 'name', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Opening hours (e.g. 09:00-17:00)"
                    value={attraction.openingHours}
                    onChange={(e) => handleAttractionChange(index, 'openingHours', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    value={attraction.price}
                    onChange={(e) => handleAttractionChange(index, 'price', e.target.value)}
                    style={{ ...styles.input, flex: 1, margin: 0 }}
                  />
                  {formData.attractions.length > 1 && (
                    <button
                      onClick={() => removeAttraction(index)}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button onClick={addAttraction} style={styles.addBtn}>
                + Add Another Attraction
              </button>
            </div>
          </div>
        )}

   {collection === "flights" && (
  <div style={styles.form}>
    {/* City */}
    <input 
      name="city" 
      placeholder="City" 
      style={styles.input}
      value={formData.city} 
      onChange={handleChange} 
    />

    {/* טיסות */}
    {formData.flights?.map((flight, index) => (
      <div key={index} style={{ marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Airline / Flight"
          style={styles.input}
          value={flight.name}
          onChange={e => {
            const updatedFlights = [...formData.flights];
            updatedFlights[index].name = e.target.value;
            setFormData(prev => ({ ...prev, flights: updatedFlights }));
          }}
        />
        <input
          type="number"
          placeholder="Price"
          style={styles.input}
          value={flight.price}
          onChange={e => {
            const updatedFlights = [...formData.flights];
            updatedFlights[index].price = e.target.value;
            setFormData(prev => ({ ...prev, flights: updatedFlights }));
          }}
        />
        <input
          type="text"
          placeholder="Duration (e.g. 8h 00m)"
          style={styles.input}
          value={flight.duration}
          onChange={e => {
            const updatedFlights = [...formData.flights];
            updatedFlights[index].duration = e.target.value;
            setFormData(prev => ({ ...prev, flights: updatedFlights }));
          }}
        />
      </div>
    ))}

    {/* כפתור הוספת טיסה חדשה */}
    <button
      type="button"
      onClick={() => {
        setFormData(prev => ({
          ...prev,
          flights: [...(prev.flights || []), { name: "", price: "", duration: "" }]
        }));
      }}
      style={{ marginTop: 10 }}
    >
      Add Another Flight
    </button>
  </div>
)}


        <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    );
  }

  // רינדור התוכן בהתאם للشונית פעילה
  const renderContent = () => {
    if (activeItem === "Manage Data") {
      return (
        <>
          <h1 className="main-title">Manage Travel Data</h1>
          <ManageDataUpdateBox />
        </>
      );
    }

    if (activeItem === "Dashboard") {
      return (
        <>
          <h1 className="main-title">Dashboard</h1>
          <section className="stats-section">
            <div className="stat-card">
              <p className="stat-title">Trips this month</p>
              <p className="stat-value">{dashboardData.totalOrders}</p>
              <p className="stat-change-positive">+10%</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Revenue this month</p>
              <p className="stat-value">${(dashboardData.totalRevenue || 0).toFixed(2)}</p>
              <p className="stat-change-positive">+15%</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Average trip rating</p>
              <p className="stat-value">4.8</p>
              <p className="stat-change-positive">+5%</p>
            </div>
          </section>
          
          <section className="graph-section">
            <div className="graph-card">
              <p className="graph-title">Trips by destination</p>
              {dashboardData.topDestinations?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dashboardData.topDestinations}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="trips" fill="#47569e" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>No trip destinations data available.</p>
              )}
            </div>

            <div className="graph-card">
              <p className="graph-title">Revenue over time</p>
              {dashboardData.revenueByMonth?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dashboardData.revenueByMonth.map(item => ({
                    date: item.monthLabel || item.month,
                    revenue: item.revenue
                  }))}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value.toFixed(2)}`} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#47569e"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No revenue data available.</p>
              )}
            </div>
          </section>
        </>
      );
    }

    if (activeItem === "Update City") {
      return <UpdateCity />;
    }
    
    if (activeItem === "Trips") {
      const tripsData = dashboardData.topDestinations || [];
      return (
        <>
          <h1 className="main-title">Popular Trips</h1>
          <section className="stats-section" style={{ marginBottom: 20 }}>
            {dashboardData.topDestinations.map(({ name, trips }) => (
              <div key={name} className="stat-card">
                <p className="stat-title">{name}</p>
                <p className="stat-value">{trips}</p>
              </div>
            ))}
          </section>
          <section className="graph-section">
            <div className="graph-card" style={{ width: "60%", margin: "0 auto" }}>
              <p className="graph-title">Trips per Destination</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={tripsData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      );
    }
    return null;
  };

  return (
    <div className="manager-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Pathmakers</h1>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item}
              className={`sidebar-nav-item ${activeItem === item ? "active" : ""}`}
              onClick={() => setActiveItem(item)}
            >
              <p>{item}</p>
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">{renderContent()}</main>
    </div>
  );
};

export default Manager;