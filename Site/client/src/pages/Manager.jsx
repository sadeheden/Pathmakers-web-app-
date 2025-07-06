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

const sidebarItems = ["Dashboard", "Trips", "Articles", "Settings", "Help"];

const Manager = () => {
  const [activeItem, setActiveItem] = useState("Dashboard");

  const renderContent = () => {
    switch (activeItem) {
      case "Dashboard":
        return (
          <>
            <h1 className="main-title">Dashboard</h1>

            {/* Stats cards */}
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

            {/* Graphs */}
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

            {/* Manage Trips table */}
            <section>
              <h2 className="section-title">Manage Trips</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {["Trip", "Destination", "Dates", "Status", "Actions"].map((head) => (
                        <th key={head}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Paris Adventure</td>
                      <td className="text-[#47569e]">Paris, France</td>
                      <td className="text-[#47569e]">May 15-22, 2024</td>
                      <td className="status">
                        <button>Upcoming</button>
                      </td>
                      <td className="actions">Edit</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </>
        );

      case "Trips":
        return (
          <>
            <h1 className="main-title">Trips Statistics</h1>
            <div className="graph-card">
              <p className="graph-title">Trips by destination</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tripsData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="trips" fill="#47569e" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        );

      case "Articles":
        return (
          <>
            <h1 className="main-title">Manage Articles</h1>
            <p>Here you can create, edit, or delete articles for the site.</p>
          </>
        );

      case "Settings":
        return (
          <>
            <h1 className="main-title">Settings</h1>
            <p>Adjust your user preferences and app settings here.</p>
          </>
        );

      case "Help":
        return (
          <>
            <h1 className="main-title">Help & Support</h1>
            <p>Find FAQs or contact support for assistance.</p>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="manager-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Pathmakers</h1>
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => (
            <div
              key={item}
              className={`sidebar-nav-item ${
                activeItem === item ? "active" : ""
              }`}
              onClick={() => setActiveItem(item)}
            >
              <p>{item}</p>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">{renderContent()}</main>
    </div>
  );
};

export default Manager;
