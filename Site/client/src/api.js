const backendUrl = "https://pathmakers-web-app-app-travel.onrender.com/api";

// Example fetch
export const getOrders = async () => {
  const response = await fetch(`${backendUrl}/api/orders`);
  const data = await response.json();
  return data;
};
export async function get(endpoint) {
  try {
    const token = localStorage.getItem('token'); // 👈 web storage

    const response = await fetch(`${base_url}/${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
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
