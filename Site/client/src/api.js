// FIXED: Use your actual backend URL without duplicate /api
const backendUrl = "https://pathmakers-server-site.onrender.com";

// Example fetch - FIXED: Remove duplicate /api
export const getOrders = async () => {
  const response = await fetch(`${backendUrl}/api/orders`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data;
};

// FIXED: Define base_url properly
const base_url = backendUrl;

export async function get(endpoint) {
  try {
    const token = localStorage.getItem('token');

    // FIXED: Ensure endpoint doesn't start with /api if it's already included
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
    const url = `${base_url}/api/${cleanEndpoint}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// POST helper
export async function post(endpoint, data = {}) {
  try {
    const token = localStorage.getItem('token');
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
    const url = `${base_url}/api/${cleanEndpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error posting data:', error);
    throw error;
  }
}

// PUT helper
export async function put(endpoint, data = {}) {
  try {
    const token = localStorage.getItem('token');
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
    const url = `${base_url}/api/${cleanEndpoint}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
}

// DELETE helper
// DELETE helper
export async function del(endpoint) {
  try {
    const token = localStorage.getItem('token');
    const cleanEndpoint = endpoint.startsWith('/api/') ? endpoint.slice(4) : endpoint;
    const url = `${base_url}/api/${cleanEndpoint}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}

// 👇 ADD THIS
export const API_BASE = backendUrl;
export default API_BASE;
m