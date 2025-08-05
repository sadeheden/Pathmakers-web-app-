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
  "Settings",
];

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
    ordersByDate: [],
    revenueByDate: [],
  });

  // טען נתוני דשבורד כשעוברים ללשונית Dashboard
  useEffect(() => {
    if (activeItem === "Dashboard") {
      fetch("http://localhost:4000/api/manager/dashboard")
        .then((res) => res.json())
        .then((data) => {
          setDashboardData({
            totalOrders: data.totalOrders,
            totalRevenue: data.totalRevenue,
            topDestinations: data.topDestinations.map(({ destination, count }) => ({
              name: destination,
              trips: count,
            })),
            ordersByDate: data.ordersByDate || [],
            revenueByDate: data.revenueByDate || [],
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

  // כאן: רכיב UpdateCity מעודכן עם כפתורי שמירה נפרדים לכל סוג נתונים
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

    const handleSaveAttractions = async () => {
      if (!cityData) {
        alert("Please load a city first");
        return;
      }
      try {
        
        // בניית מערך האטרקציות החדשות
        const newAttractionsData = [];
        for (const attraction of newAttractions) {
          if (!attraction.name || !attraction.openingHours || attraction.price === "") {
            alert("Please fill all attraction fields (name, opening hours, price)");
            return;
          }
          newAttractionsData.push({
            name: attraction.name,
            openingHours: attraction.openingHours,
            price: parseFloat(attraction.price),
          });
        }
            
        await fetch(`http://localhost:4000/api/cities/${cityData._id}/attractions`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ attractions: newAttractionsData }),
});


    alert("Attractions updated successfully!");
    setNewAttractions([{ name: "", openingHours: "", price: "" }]); // איפוס השדות
    fetchCityData(); // טוען מחדש את נתוני העיר
  } catch (error) {
    console.error("Error updating attractions:", error);
        alert("Error updating attractions");
      }
    };
const handleSaveHotels = async () => {
  if (!cityData) {
    alert("Please load a city first");
    return;
  }
  try {
    // בניית מערך המלונות החדשים
    const newHotelsData = [];
    for (const hotel of newHotels) {
      if (!hotel.name || hotel.price === "") {
        alert("Please fill all hotel fields");
        return;
      }
      newHotelsData.push({
        name: hotel.name,
        price: parseFloat(hotel.price),
        stars: 3,
      });
    }
    
    // הוספת המלונות החדשים למערך הקיים
    await fetch(`http://localhost:4000/api/cities/${cityData._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cityData,
        hotels: [...(cityData.hotels || []), ...newHotelsData]
      }),
    });
    
    alert("Hotels added successfully!");
    setNewHotels([{ name: "", price: "" }]); // איפוס השדות
    fetchCityData(); // טוען מחדש את נתוני העיר
  } catch (error) {
    console.error("Error updating hotels:", error);
    alert("Error updating hotels");
  }
};

const handleSaveFlights = async () => {
  if (!cityData) {
    alert("Please load a city first");
    return;
  }
  try {
    // בניית מערך הטיסות החדשות
    const newFlightsData = [];
    for (const flight of newFlights) {
      if (!flight.name || flight.price === "" || !flight.duration) {
        alert("Please fill all flight fields (name, price, duration)");
        return;
      }
      newFlightsData.push({
        name: flight.name,
        price: parseFloat(flight.price),
        duration: flight.duration,
      });
    }
    
    // הוספת הטיסות החדשות למערך הקיים
    await fetch(`http://localhost:4000/api/cities/${cityData._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cityData,
        flights: [...(cityData.flights || []), ...newFlightsData]
      }),
    });
    
    alert("Flights added successfully!");
    setNewFlights([{ name: "", price: "", duration: "" }]); // איפוס השדות
    fetchCityData(); // טוען מחדש את נתוני העיר
  } catch (error) {
    console.error("Error updating flights:", error);
    alert("Error updating flights");
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
                    {a.name} - {a.description}
                  </li>
                ))}
              </ul>

              <h3>Flights ({cityData.flights?.length || 0})</h3>
              <ul>
                {cityData.flights?.map((f, i) => (
                  <li key={i}>
                    Flight from {f.city} to {f.airline} - ${f.price}
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
              style={{ marginTop: 10, padding: "6px 12px", fontWeight: "bold" }}
              onClick={handleSaveAttractions}
            >
              Save Attractions
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

  // רינדור התוכן בהתאם ללשונית פעילה
  const renderContent = () => {
    if (activeItem === "Manage Data") {
      return (
        <>
          <h1 className="main-title">Manage Travel Data</h1>
          {successMessage && <div className="success-message">{successMessage}</div>}
          <section className="admin-tools">
            {/* עיר */}
            <div className="tool-card">
              <h2>City Name</h2>
              <input
                type="text"
                placeholder="City Name"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
              />
            </div>
            {/* אטרקציות */}
            <div className="tool-card">
              <h2>Add Attractions</h2>
              {attractions.map((a, i) => (
                <div key={i} className="input-group">
                  <input
                    type="text"
                    placeholder="Attraction Name"
                    value={a.name}
                    onChange={(e) => {
                      const updated = [...attractions];
                      updated[i].name = e.target.value;
                      setAttractions(updated);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={a.city}
                    onChange={(e) => {
                      const updated = [...attractions];
                      updated[i].city = e.target.value;
                      setAttractions(updated);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={a.description}
                    onChange={(e) => {
                      const updated = [...attractions];
                      updated[i].description = e.target.value;
                      setAttractions(updated);
                    }}
                  />
                </div>
              ))}
              <button onClick={addNewAttraction}>+ Add Another Attraction</button>
            </div>
            {/* מלונות */}
            <div className="tool-card">
              <h2>Add Hotels</h2>
              {hotels.map((h, i) => (
                <div key={i} className="input-group">
                  <input
                    type="text"
                    placeholder="Hotel Name"
                    value={h.name}
                    onChange={(e) => {
                      const updated = [...hotels];
                      updated[i].name = e.target.value;
                      setHotels(updated);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={h.city}
                    onChange={(e) => {
                      const updated = [...hotels];
                      updated[i].city = e.target.value;
                      setHotels(updated);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={h.price}
                    onChange={(e) => {
                      const updated = [...hotels];
                      updated[i].price = e.target.value;
                      setHotels(updated);
                    }}
                  />
                </div>
              ))}
              <button onClick={addNewHotel}>+ Add Another Hotel</button>
            </div>
            {/* טיסות */}
            <div className="tool-card">
              <h2>Add Flights</h2>
              {flights.map((f, i) => (
                <div key={i} className="input-group">
                  <input
                    type="text"
                    placeholder="From"
                    value={f.from}
                    onChange={(e) => {
                      const updated = [...flights];
                      updated[i].from = e.target.value;
                      setFlights(updated);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="To"
                    value={f.to}
                    onChange={(e) => {
                      const updated = [...flights];
                      updated[i].to = e.target.value;
                      setFlights(updated);
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={f.price}
                    onChange={(e) => {
                      const updated = [...flights];
                      updated[i].price = e.target.value;
                      setFlights(updated);
                    }}
                  />
                </div>
              ))}
              <button onClick={addNewFlight}>+ Add Another Flight</button>
            </div>
            {/* כפתור שמירה לכל הנתונים */}
            <div style={{ marginTop: 20 }}>
              <button
                onClick={handleAddAllData}
                style={{ fontWeight: "bold", padding: "10px 20px" }}
              >
                Save All Data
              </button>
            </div>
          </section>
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
              <p className="stat-value">${dashboardData.totalRevenue.toFixed(2)}</p>
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
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dashboardData.topDestinations}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#47569e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="graph-card">
              <p className="graph-title">Revenue over time</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dashboardData.revenueByDate}>
                  <XAxis dataKey="date" tickFormatter={(str) => str.slice(5)} />
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
            {tripsData.map(({ name, trips }) => (
              <div
                key={name}
                className="stat-card"
                style={{ width: "30%", minWidth: 150 }}
              >
                <p className="stat-title">{name}</p>
                <p className="stat-value">{trips} Trips</p>
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