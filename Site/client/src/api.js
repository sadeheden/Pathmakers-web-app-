const backendUrl = "https://pathmakers-web-app-app-travel.onrender.com";

// Example fetch
export const getOrders = async () => {
  const response = await fetch(`${backendUrl}/api/orders`);
  const data = await response.json();
  return data;
};