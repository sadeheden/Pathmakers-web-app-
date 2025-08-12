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
  "Update City",
];
const styles = {
  box: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "28px",
    maxWidth: "1000px",   // ⬅ bigger
    width: "100%",        // ⬅ fill available space
    backgroundColor: "#fff",
    boxShadow: "0 6px 22px rgba(0,0,0,0.08)",
    marginTop: "16px",
  },
  header: { marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center" },
  label: { fontWeight: 700, minWidth: 160, fontSize: 16 },
  select: { padding: "14px", borderRadius: "12px", border: "1px solid #d1d5db", width: "100%", fontSize: 16 },

  // Bigger grid + more columns
  form: {
    marginBottom: "20px",
    display: "grid",
    gap: "14px",
    gridTemplateColumns: "1fr 1fr 1fr", // ⬅ three columns
  },

  input: {
    padding: "14px",      // ⬅ bigger inputs
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    width: "100%",
    fontSize: 16,
  },
  textarea: {
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    minHeight: 120,       // ⬅ taller text area
    gridColumn: "1 / -1", // full width in the grid
    fontSize: 16,
  },

  saveBtn: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    padding: "14px 22px", // ⬅ bigger button
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    width: "220px",       // ⬅ wider
    fontWeight: 800,
    fontSize: 16,
  },

  // Step 1 grid (bigger cards, 2→3 columns)
gridWrap: {
  display: "grid",
  gridTemplateColumns: "1fr 1fr", // ⬅ two columns
  gap: "16px",
  maxWidth: 800,                  // ⬅ fits nicely in two-column layout
  marginTop: 16,
},

  card: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    padding: "18px 20px", // ⬅ bigger card
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    boxShadow: "0 3px 12px rgba(0,0,0,0.06)",
    cursor: "pointer",
    transition: "transform .06s ease, box-shadow .12s ease",
  },
  cardHover: { transform: "translateY(-2px)", boxShadow: "0 10px 22px rgba(0,0,0,0.10)" },
  cardIcon: {
    width: 56,            // ⬅ bigger icon
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

  // Step 2 header + success
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
};


const Manager = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [successMessage, setSuccessMessage] = useState("");
  // רשימות דינמיות של אטרקציות, מלונות, טיסות
  const [attractions, setAttractions] = useState([{ name: "", city: "", description: "" }]);
  const [hotels, setHotels] = useState([{ name: "", city: "", price: "" }]);
  const [flights, setFlights] = useState([{ from: "", to: "", price: "" }]);
  // עיר אחת - שם העיר
  const [cityName, setCityName] = useState("");
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


  // פונקציות להוספת שורה חדשה בטפסים
  const addNewAttraction = () => {
    setAttractions([...attractions, { name: "", city: "", description: "" }]);
  };
  const addNewHotel = () => {
    setHotels([...hotels, { name: "", city: "", price: "" }]);
  };
  // כאן תיקנתי את השם מ-setNewFlights ל-setFlights ושדות בהתאם לטיסות שהגדרת קודם
  const addNewFlight = () => {
    setFlights([...flights, { from: "", to: "", price: "" }]);
  };

  // פונקציה לשמירת כל הנתונים ביחד
  const handleAddAllData = async () => {
    // בדיקות מילוי שדות
    if (!cityName) {
      alert("Please enter a city name");
      return;
    }
    if (attractions.some((a) => !a.name || !a.city || !a.description)) {
      alert("Please fill all attraction fields");
      return;
    }
    if (hotels.some((h) => !h.name || !h.city || !h.price)) {
      alert("Please fill all hotel fields");
      return;
    }
    if (flights.some((f) => !f.from || !f.to || !f.price)) {
      alert("Please fill all flight fields");
      return;
    }
    try {
      // הוספת העיר
      await fetch("http://localhost:4000/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: cityName }),
      });

      // הוספת אטרקציות
      for (const attraction of attractions) {
        await fetch("http://localhost:4000/api/attractions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attraction),
        });
      }
      // הוספת מלונות
      for (const hotel of hotels) {
        await fetch("http://localhost:4000/api/hotels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...hotel, price: parseFloat(hotel.price), stars: 3 }),
        });
      }
      // הוספת טיסות
      for (const flight of flights) {
        await fetch("http://localhost:4000/api/flights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: flight.from,
            airline: `Flight to ${flight.to}`,
            departureTime: new Date().toISOString(),
            price: parseFloat(flight.price),
          }),
        });
      }

      setSuccessMessage("✅ All travel data added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      // איפוס שדות
      setCityName("");
      setAttractions([{ name: "", city: "", description: "" }]);
      setHotels([{ name: "", city: "", price: "" }]);
      setFlights([{ from: "", to: "", price: "" }]);
    } catch (error) {
      console.error("Error adding data:", error);
      alert("Error adding data. Check console.");
    }
  };

  // כאן: רכיב UpdateCity מעודכן עם אפשרות הוספת אטרקציות חדשות למערך הקיים
  const UpdateCity = () => {
    const [searchCity, setSearchCity] = useState("");
    const [cityData, setCityData] = useState(null);

    const [newAttractions, setNewAttractions] = useState([
      { name: "", openingHours: "", price: "" },
    ]);
    const [newHotels, setNewHotels] = useState([{ name: "", price: "" }]);
    const [newFlights, setNewFlights] = useState([
      { name: "", price: "", duration: "" },
    ]);

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
          // עיר לא נמצאה - ניצור חדשה
          const createResponse = await fetch("http://localhost:4000/api/cities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city: searchCity }),
          });

          if (!createResponse.ok) {
            throw new Error("Failed to create new city");
          }

          data = await createResponse.json();
          alert(`✅ City '${searchCity}' created`);
          console.log("🆕 Created new city data:", data);
        } else {
          throw new Error(`Failed to fetch city. Status: ${response.status}`);
        }

        // עדכון ה-state עם הנתונים שהתקבלו
        setCityData(data);

        // איפוס שדות הקלט של אטרקציות, מלונות וטיסות
        setNewAttractions([{ name: "", openingHours: "", price: "" }]);
        setNewHotels([{ name: "", price: "" }]);
        setNewFlights([{ name: "", price: "", duration: "" }]);

      } catch (err) {
        console.error("Fetch error:", err);
        alert("Error fetching or creating city data");
        setCityData(null);
      }
    };

    const addNewAttraction = () =>
      setNewAttractions([...newAttractions, { name: "", openingHours: "", price: "" }]);
    const addNewHotel = () => setNewHotels([...newHotels, { name: "", price: "" }]);
    const addNewFlight = () =>
      setNewFlights([...newFlights, { name: "", price: "", duration: "" }]);

    // **פונקציה חדשה** לשמירת אטרקציות למערך attractions בתוך מסמך העיר
    const handleSaveAttractions = async () => {
      if (!cityData) {
        alert("Please load a city first");
        return;
      }
      
      // ולידציה של השדות
      const validAttractions = [];
      for (const attraction of newAttractions) {
        if (!attraction.name || !attraction.openingHours || attraction.price === "") {
          alert("Please fill all attraction fields (name, opening hours, price)");
          return;
        }
        validAttractions.push({
          name: attraction.name.trim(),
          openingHours: attraction.openingHours.trim(),
          price: parseFloat(attraction.price),
        });
      }

      if (validAttractions.length === 0) {
        alert("No valid attractions to add");
        return;
      }

      try {
        // הוספת האטרקציות למערך attractions בתוך מסמך העיר באמצעות הקונטרולר החדש
        const response = await fetch(`http://localhost:4000/api/manager/city/${cityData._id}/addNewAttractions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attractions: validAttractions }),
        });

        if (response.ok) {
          const result = await response.json();
          alert(result.message || `✅ ${validAttractions.length} attractions added to city attractions array!`);
          
          // עדכון הנתונים המקומיים
          if (result.city) {
            setCityData(result.city);
          } else {
            // טוען מחדש את נתוני העיר
            fetchCityData();
          }
          
          // איפוס השדות
          setNewAttractions([{ name: "", openingHours: "", price: "" }]);
        } else {
          const error = await response.json();
          alert(`Error: ${error.message || 'Failed to add attractions'}`);
        }
      } catch (error) {
        console.error("Error adding attractions:", error);
        alert("Error adding attractions. Check console.");
      }
    };

  // Hotels -> POST to /api/manager/city/:id/addNewHotels
const handleSaveHotels = async () => {
  if (!cityData) return alert("Please load a city first");

  const payload = [];
  for (const hotel of newHotels) {
    if (!hotel.name || hotel.price === "") {
      alert("Please fill all hotel fields");
      return;
    }
    payload.push({
      name: hotel.name.trim(),
      price: parseFloat(hotel.price),
      stars: 3,
    });
  }
  try {
    const res = await fetch(`http://localhost:4000/api/manager/city/${cityData._id}/addNewHotels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotels: payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to add hotels");
    alert(data.message || `✅ ${payload.length} hotels added`);
    setNewHotels([{ name: "", price: "" }]);
    // refresh local view
    if (data.city) setCityData(data.city); else fetchCityData();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// Flights -> POST to /api/manager/city/:id/addNewFlights
const handleSaveFlights = async () => {
  if (!cityData) return alert("Please load a city first");

  const payload = [];
  for (const flight of newFlights) {
    if (!flight.name || flight.price === "" || !flight.duration) {
      alert("Please fill all flight fields (name, price, duration)");
      return;
    }
    payload.push({
      name: flight.name.trim(),
      price: parseFloat(flight.price),
      duration: flight.duration.trim(),
    });
  }
  try {
    const res = await fetch(`http://localhost:4000/api/manager/city/${cityData._id}/addNewFlights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flights: payload }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to add flights");
    alert(data.message || `✅ ${payload.length} flights added`);
    setNewFlights([{ name: "", price: "", duration: "" }]);
    // refresh local view
    if (data.city) setCityData(data.city); else fetchCityData();
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};


    return (
      <div className="update-city-container">
        <h1>Update City Data</h1>
        <div>
          <input
            type="text"
            placeholder="Enter city name"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          />
          <button onClick={fetchCityData}>Load City Data</button>
        </div>
        {cityData && (
          <>
            <h2>Current Data for {cityData.city} (ID: {cityData._id})</h2>
            <div>
              <h3>Hotels ({cityData.hotels?.length || 0})</h3>
              <ul>
                {cityData.hotels?.map((h, i) => (
                  <li key={i}>
                    {h.name} - ${h.price}
                  </li>
                ))}
              </ul>

              <h3>Attractions ({cityData.attractions?.length || 0})</h3>
              <ul>
                {cityData.attractions?.map((a, i) => (
                  <li key={i}>
                    {a.name} - {a.openingHours} - ${a.price}
                  </li>
                ))}
              </ul>

              <h3>Flights ({cityData.flights?.length || 0})</h3>
              <ul>
                {cityData.flights?.map((f, i) => (
                  <li key={i}>
                    {f.name} - ${f.price} - {f.duration}
                  </li>
                ))}
              </ul>
            </div>

            <h3>Add New Attractions</h3>
            {newAttractions.map((a, i) => (
              <div key={i} className="input-group">
                <input
                  type="text"
                  placeholder="Attraction Name"
                  value={a.name}
                  onChange={(e) => {
                    const updated = [...newAttractions];
                    updated[i].name = e.target.value;
                    setNewAttractions(updated);
                  }}
                />
                <input
                  type="text"
                  placeholder="Opening Hours (e.g. 09:00-18:00)"
                  value={a.openingHours}
                  onChange={(e) => {
                    const updated = [...newAttractions];
                    updated[i].openingHours = e.target.value;
                    setNewAttractions(updated);
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={a.price}
                  onChange={(e) => {
                    const updated = [...newAttractions];
                    updated[i].price = e.target.value;
                    setNewAttractions(updated);
                  }}
                />
              </div>
            ))}
            <button onClick={addNewAttraction}>+ Add Another Attraction</button>
            <button
              style={{ 
                marginTop: 10, 
                marginLeft: 10,
                padding: "8px 16px", 
                fontWeight: "bold",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
              onClick={handleSaveAttractions}
            >
              Save Attractions to City Array
            </button>

            <h3>Add New Hotels</h3>
            {newHotels.map((h, i) => (
              <div key={i} className="input-group">
                <input
                  type="text"
                  placeholder="Hotel Name"
                  value={h.name}
                  onChange={(e) => {
                    const updated = [...newHotels];
                    updated[i].name = e.target.value;
                    setNewHotels(updated);
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={h.price}
                  onChange={(e) => {
                    const updated = [...newHotels];
                    updated[i].price = e.target.value;
                    setNewHotels(updated);
                  }}
                />
              </div>
            ))}
            <button onClick={addNewHotel}>+ Add Another Hotel</button>
            <button
              style={{ marginTop: 10, padding: "6px 12px", fontWeight: "bold" }}
              onClick={handleSaveHotels}
            >
              Save Hotels
            </button>

            <h3>Add New Flights</h3>
            {newFlights.map((f, i) => (
              <div key={i} className="input-group">
                <input
                  type="text"
                  placeholder="Airline Name"
                  value={f.name}
                  onChange={(e) => {
                    const updated = [...newFlights];
                    updated[i].name = e.target.value;
                    setNewFlights(updated);
                  }}
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={f.price}
                  onChange={(e) => {
                    const updated = [...newFlights];
                    updated[i].price = e.target.value;
                    setNewFlights(updated);
                  }}
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 8h 00m)"
                  value={f.duration}
                  onChange={(e) => {
                    const updated = [...newFlights];
                    updated[i].duration = e.target.value;
                    setNewFlights(updated);
                  }}
                />
              </div>
            ))}
            <button onClick={addNewFlight}>+ Add Another Flight</button>
            <button
              style={{ marginTop: 10, padding: "6px 12px", fontWeight: "bold" }}
              onClick={handleSaveFlights}
            >
              Save Flights
            </button>
          </>
        )}
      </div>
    );
  };
function ManageDataUpdateBox() {
  const [step, setStep] = useState("choose"); // "choose" | "form"
  const [collection, setCollection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    // cities
    cityName: "",
    // hotels
    hotelName: "", hotelPrice: "",
    // flights
    flightName: "", flightPrice: "", flightDuration: "",
    // attractions
    attractionName: "", attractionPrice: "",
  });

  const pick = (key) => {
    setCollection(key);
    setSaved(false);
    setStep("form");
  };

const handleChange = (e) => {
  const { name, value } = e.target;
  console.log("handleChange:", name, value, typeof value);
  setFormData((prev) => ({ ...prev, [name]: value }));
};

  const handleBack = () => {
    // reset form for clarity
    setFormData({
      cityName: "",
      hotelName: "", hotelPrice: "",
      flightName: "", flightPrice: "", flightDuration: "",
      attractionName: "", attractionPrice: "",
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
        const cityName = formData.cityName.trim();
        console.log("Sending payload for city:", { city: cityName });
        payload = { city: cityName };
        break;



      case "hotels":
        if (!formData.city || !formData.hotelName || !formData.hotelPrice)
          throw new Error("City, name and price are required");
        url = "http://localhost:4000/api/hotels";
        payload = {
          city: formData.city.trim(),
          name: formData.hotelName.trim(),
          price: parseFloat(formData.hotelPrice),
        };
        break;

      case "flights":
        if (!formData.city || !formData.flightName || !formData.flightPrice || !formData.flightDuration)
          throw new Error("City, name, price and duration are required");
        url = "http://localhost:4000/api/flights";
        payload = {
          city: formData.city.trim(),
          airline: formData.flightName.trim(),
          price: parseFloat(formData.flightPrice),
          duration: formData.flightDuration.trim(),
        };
        break;

      case "attractions":
        if (!formData.city || !formData.attractionName || !formData.openingHours || !formData.attractionPrice)
          throw new Error("City, name, opening hours, and price are required");
        url = "http://localhost:4000/api/attractions";
        payload = {
          city: formData.city.trim(),
          name: formData.attractionName.trim(),
          openingHours: formData.openingHours.trim(),
          price: parseFloat(formData.attractionPrice),
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
    if (!res.ok) throw new Error(data?.message || "Failed to save");

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
          {/* Cities */}
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
              <div style={styles.cardDesc}>Add a new city with optional country</div>
            </div>
          </div>

          {/* Hotels */}
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
              <div style={styles.cardDesc}>Add a hotel (name, price, stars)</div>
            </div>
          </div>

          {/* Flights */}
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
              <div style={styles.cardDesc}>Add a flight (name, price, duration)</div>
            </div>
          </div>

          {/* Attractions */}
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
              <div style={styles.cardDesc}>Add an attraction (name, price, desc)</div>
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

      <div style={{ marginBottom: 8, fontWeight: 700 }}>
        Update: {collection?.[0].toUpperCase() + collection?.slice(1)}
      </div>

      <div style={styles.form}>
        {collection === "cities" && (
          <>
            <input name="cityName" placeholder="City name" style={styles.input}
              value={formData.cityName} onChange={handleChange} />        
          </>
        )}
{collection === "hotels" && (
  <>
    <input name="city" placeholder="City" style={styles.input}
      value={formData.city || ""} onChange={handleChange} />
    <input name="hotelName" placeholder="Hotel name" style={styles.input}
      value={formData.hotelName} onChange={handleChange} />
    <input name="hotelPrice" type="number" placeholder="Price" style={styles.input}
      value={formData.hotelPrice} onChange={handleChange} />
  </>)}

        {collection === "flights" && (
  <>
    <input name="city" placeholder="City" style={styles.input}
      value={formData.city || ""} onChange={handleChange} />
    <input name="flightName" placeholder="Airline / Flight" style={styles.input}
      value={formData.flightName} onChange={handleChange} />
    <input name="flightPrice" type="number" placeholder="Price" style={styles.input}
      value={formData.flightPrice} onChange={handleChange} />
    <input name="flightDuration" placeholder='Duration (e.g. "8h 00m")' style={styles.input}
      value={formData.flightDuration} onChange={handleChange} />
  </>
)}

     {collection === "attractions" && (
  <>
    <input name="city" placeholder="City" style={styles.input}
      value={formData.city || ""} onChange={handleChange} />
    <input name="attractionName" placeholder="Attraction name" style={styles.input}
      value={formData.attractionName} onChange={handleChange} />
    <input name="attractionPrice" type="number" placeholder="Price" style={styles.input}
      value={formData.attractionPrice} onChange={handleChange} />
    <input name="openingHours" placeholder='Opening hours (e.g. "09:00-17:00")' style={styles.input}
      value={formData.openingHours || ""} onChange={handleChange} />   
  </>
)}
      </div>

      <button onClick={handleSave} style={styles.saveBtn} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}


  // רינדור התוכן בהתאם ללשונית פעילה
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
        date: item.monthLabel || item.month, // שימוש ב-monthLabel או month
        revenue: item.revenue
      }))}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
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