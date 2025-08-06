import AsyncStorage from '@react-native-async-storage/async-storage';

const base_url = "https://pathmakers-web-app-app-travel.onrender.com/api";


export async function get(endpoint) {
  try {
    const token = await AsyncStorage.getItem('token'); // 👈 get token

    const response = await fetch(`${base_url}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`, // 👈 include it
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error('Network response was not ok');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

export async function post(endpoint, data) {
  try {
    const token = await AsyncStorage.getItem('token'); // 👈 get token

    const res = await fetch(`${base_url}/${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }), // add token if exists
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Request failed');
    }

    return result;
  } catch (err) {
    console.error('API Error:', err.message);
    throw err;
  }
}

export async function put(endpoint, data) {
  try {
    const token = await AsyncStorage.getItem('token'); // 👈 get token

    const response = await fetch(`${base_url}/${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating data:', error);
    throw error;
  }
}

export async function del(endpoint) {
  try {
    const token = await AsyncStorage.getItem('token'); // 👈 get token

    const response = await fetch(`${base_url}/${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error('Error deleting data:', error);
    throw error;
  }
}
