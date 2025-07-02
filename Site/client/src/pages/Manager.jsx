import React, { useState, useEffect } from 'react';
import "../assets/styles/manager.css"; 

const AdminPage = () => {
  const [items, setItems] = useState([]); // A set of items
  const [newItem, setNewItem] = useState(''); // A new item to add
  const [stats, setStats] = useState({ // Statistics
    users: 0,
    tripsBought: 0,
    sales: 0,
    profit: 0,
  });

  // Fetch data from the API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // API call to retrieve data from the server
        const response = await fetch('/api/info'); // Your API endpoint
        const data = await response.json(); // Convert the response to JSON
        
        // Save the data to state
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, []); // The call is made only when the component is mounted

  const addItem = () => {
    if (newItem) {
      setItems([...items, newItem]);
      setNewItem('');
    }
  };

  const deleteItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  return (
    <div className="admin-page">
      <h1 className="h1-manager">Admin Page</h1>

      {/* Statistics Section */}
      <section className="stats-section">
        <div className="stat-card">
          <h2 className="h2-category">Users</h2>
          <p className="stat-number">{stats.users}</p>
        </div>
        <div className="stat-card">
          <h2 className="h2-category">Trips Bought</h2>
          <p className="stat-number">{stats.tripsBought}</p>
        </div>
        <div className="stat-card">
          <h2 className="h2-category">Sales</h2>
          <p className="stat-number">{stats.sales}</p>
        </div>
        <div className="stat-card">
          <h2 className="h2-category">Profit</h2>
          <p className="stat-number">{stats.profit} ₪</p>
        </div>
      </section>

      {/* Item Management */}
      <section>
        <h2 className="h2-category">Item Category</h2>
        <div className="input-container">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add a new item"
            className="input-field"
          />
          <button
            onClick={addItem}
            className="button-manager"
          >
            Add
          </button>
        </div>
        <ul className="item-list">
          {items.map((item, index) => (
            <li key={index} className="item">
              <img src="https://via.placeholder.com/50" alt="profile" />
              <span className="item-text">{item}</span>
              <span className="item-details">More Details</span>
              <button onClick={() => deleteItem(index)} className="button-manager">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminPage;
