import React, { useState } from "react";
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

const tripsData = [
  { name: "Paris", trips: 12 },
  { name: "London", trips: 18 },
  { name: "Rome", trips: 4 },
  { name: "New York", trips: 14 },
];

const revenueData = [
  { name: "Jan", revenue: 5000 },
  { name: "Feb", revenue: 7000 },
  { name: "Mar", revenue: 4000 },
  { name: "Apr", revenue: 8000 },
  { name: "May", revenue: 9000 },
  { name: "Jun", revenue: 7000 },
  { name: "Jul", revenue: 8500 },
];

const sidebarItems = [
  "Dashboard",
  "Trips",
 "Manage Data",
  "Settings",
];

const Manager = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [successMessage, setSuccessMessage] = useState("");
  const [hotels, setHotels] = useState([]);
  const [flights, setFlights] = useState([]);
  const [hotelForm, setHotelForm] = useState({ name: "", city: "", price: "" });
  const [flightForm, setFlightForm] = useState({ from: "", to: "", price: "" });
  const [cityName, setCityName] = useState("");
  const [attractionForm, setAttractionForm] = useState({ name: "", city: "", description: "" });

  const addHotelToDB = async () => {
    const { name, city, price } = hotelForm;
    if (!name || !city || price === "") return;
    try {
      const response = await fetch("http://localhost:4000/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, price: parseFloat(price), stars: 3 }),
      });
      const result = await response.json();
      console.log("✅ Hotel added:", result);
      setHotels([...hotels, result]);
      setHotelForm({ name: "", city: "", price: "" });
      setSuccessMessage("✅ Hotel added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("❌ Error adding hotel:", error);
    }
  };

  const addFlightToDB = async () => {
    const { from, to, price } = flightForm;
    if (!from || !to || price === "") return;
    try {
      const response = await fetch("http://localhost:4000/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: from, airline: `Flight to ${to}`, departureTime: new Date().toISOString(), price: parseFloat(price) }),
      });
      const result = await response.json();
      console.log("✅ Flight added:", result);
      setFlights([...flights, { from, to, price }]);
      setFlightForm({ from: "", to: "", price: "" });
      setSuccessMessage("✅ Flight added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("❌ Error adding flight:", error);
    }
  };

  const addCityToDB = async () => {
    if (!cityName) return;
    try {
      const response = await fetch("http://localhost:4000/api/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: cityName }),
      });
      const data = await response.json();
      console.log("✅ City added:", data);
      setCityName("");
      setSuccessMessage("✅ City added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error adding city:", err);
    }
  };

  const addAttractionToDB = async () => {
    const { name, city, description } = attractionForm;
    if (!name || !city) return;
    try {
      const response = await fetch("http://localhost:4000/api/attractions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, description }),
      });
      const data = await response.json();
      console.log("✅ Attraction added:", data);
      setAttractionForm({ name: "", city: "", description: "" });
      setSuccessMessage("✅ Attraction added successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("❌ Error adding attraction:", err);
    }
  };

  const renderContent = () => {
    if (activeItem === "Manage Data") {
      return (
        <>
          <h1 className="main-title">Manage Travel Data</h1>
          {successMessage && <div className="success-message">{successMessage}</div>}
          <section className="admin-tools">
            <div className="tool-card">
              <h2>Add City</h2>
              <input type="text" placeholder="City Name" value={cityName} onChange={(e) => setCityName(e.target.value)} />
              <button onClick={addCityToDB}>Add City</button>
            </div>
            <div className="tool-card">
              <h2>Add Attraction</h2>
              <input type="text" placeholder="Attraction Name" value={attractionForm.name} onChange={(e) => setAttractionForm({ ...attractionForm, name: e.target.value })} />
              <input type="text" placeholder="City" value={attractionForm.city} onChange={(e) => setAttractionForm({ ...attractionForm, city: e.target.value })} />
              <input type="text" placeholder="Description" value={attractionForm.description} onChange={(e) => setAttractionForm({ ...attractionForm, description: e.target.value })} />
              <button onClick={addAttractionToDB}>Add Attraction</button>
            </div>
            <div className="tool-card">
              <h2>Add Hotel</h2>
              <input type="text" placeholder="Hotel Name" value={hotelForm.name} onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })} />
              <input type="text" placeholder="City" value={hotelForm.city} onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value })} />
              <input type="number" placeholder="Price" value={hotelForm.price} onChange={(e) => setHotelForm({ ...hotelForm, price: e.target.value })} />
              <button onClick={addHotelToDB}>Add Hotel</button>
              <ul>{hotels.map((h, i) => (<li key={i}>{h.name} in {h.city} - ${h.price}</li>))}</ul>
            </div>
            <div className="tool-card">
              <h2>Add Flight</h2>
              <input type="text" placeholder="From" value={flightForm.from} onChange={(e) => setFlightForm({ ...flightForm, from: e.target.value })} />
              <input type="text" placeholder="To" value={flightForm.to} onChange={(e) => setFlightForm({ ...flightForm, to: e.target.value })} />
              <input type="number" placeholder="Price" value={flightForm.price} onChange={(e) => setFlightForm({ ...flightForm, price: e.target.value })} />
              <button onClick={addFlightToDB}>Add Flight</button>
              <ul>{flights.map((f, i) => (<li key={i}>Flight from {f.from} to {f.to} - ${f.price}</li>))}</ul>
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
              <p className="stat-value">12</p>
              <p className="stat-change-positive">+10%</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Revenue this month</p>
              <p className="stat-value">$15,000</p>
              <p className="stat-change-positive">+15%</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Average trip rating</p>
              <p className="stat-value">4.8</p>
              <p className="stat-change-negative">-2%</p>
            </div>
          </section>
          <section className="graph-section">
            <div className="graph-card">
              <p className="graph-title">Trips by destination</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tripsData}>
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
                <LineChart data={revenueData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#47569e" strokeWidth={2} />
                </LineChart>
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
            <div key={item} className={`sidebar-nav-item ${activeItem === item ? "active" : ""}`} onClick={() => setActiveItem(item)}>
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
