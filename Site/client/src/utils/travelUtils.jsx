import { API_BASE } from "../config/api.js";



export const cleanId = (id) => {
    if (!id) return null;
    
    // Handle string IDs
    if (typeof id === 'string') {
        const onlyHex = id.match(/[a-f\d]{24}/i);
        return onlyHex ? onlyHex[0] : null;
    }
    
    // Handle object IDs
    if (typeof id === 'object' && id.id) {
        const onlyHex = id.id.match(/[a-f\d]{24}/i);
        return onlyHex ? onlyHex[0] : null;
    }
    
    return null;
};
// src/utils/receiptUtils.js
// travelUtils.jsx - Fixed version with proper order ID handling

// travelUtils.jsx - Updated with correct API URL handling

// Get the correct API base URL
// 🔧 Replace your current getApiBase() with this:


// Calculate total price (your existing function)
export const calculateTotalPrice = (userResponses) => {
  if (!userResponses) return 0;
  
  let total = 0;
  
  // Add flight price
  const flight = userResponses["Select your flight"];
  if (flight?.price) {
    total += Number(flight.price) || 0;
  }
  
  // Add hotel price  
  const hotel = userResponses["Select your hotel"];
  if (hotel?.price) {
    total += Number(hotel.price) || 0;
  }
  
  // Add attraction prices
  const attractions = userResponses["Select attractions to visit"];
  if (Array.isArray(attractions)) {
    attractions.forEach(attraction => {
      if (attraction?.price) {
        total += Number(attraction.price) || 0;
      }
    });
  } else if (attractions?.price) {
    total += Number(attractions.price) || 0;
  }
  
  return total;
};

// Helper function to get order ID from various sources
export const getOrderId = (order) => {
  if (!order) {
    console.warn("⚠️ No order object provided");
    return null;
  }

  // Try different possible ID field names
  const possibleIds = [
    order._id,
    order.id, 
    order.orderId,
    order.order_id
  ];

  for (const id of possibleIds) {
    if (id) {
      const cleanId = String(id).trim();
      // Validate ObjectId format
      if (/^[0-9a-fA-F]{24}$/.test(cleanId)) {
        return cleanId;
      }
    }
  }

  console.error("❌ No valid order ID found in order object:", order);
  return null;
};

// Usage example for your components:
// ---- keep your existing cleanId ----

// Small helpers to save/read the last order id
export const saveLastOrderId = (orderLike) => {
  const maybeId =
    orderLike?._id ||
    orderLike?.id ||
    orderLike?.orderId ||
    orderLike?.order_id ||
    orderLike; // allow a raw string too

  const id24 = cleanId(maybeId);
  if (id24) sessionStorage.setItem("lastOrderId", id24);
  return id24;
};

export const getLastOrderId = () => {
  const raw = sessionStorage.getItem("lastOrderId");
  return cleanId(raw);
};

// ---- API base as you wrote ----
const getApiBase = () => {
  if (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/$/, "");
  }
  if (typeof process !== "undefined" &&
      process.env &&
      process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.__API_BASE__) {
    return String(window.__API_BASE__).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
    return "https://pathmakers-server-site.onrender.com";
  }
  return "";
};

export const downloadReceipt = async (orderIdLike) => {
  try {
    console.log("🔍 Attempting to download receipt for order ID:", orderIdLike);

    // ✅ Use cleanId() so "id-0" or objects work
    const id24 = cleanId(orderIdLike);
    if (!id24) {
      console.error("❌ No valid order ID (after cleaning). Input:", orderIdLike);
      throw new Error("Order ID is required to download receipt");
    }

    const API_BASE = getApiBase();

    // auth
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt");
    if (!token) throw new Error("You must be logged in to download receipts");

    const headers = { Authorization: `Bearer ${token}` };

    const url = API_BASE
      ? `${API_BASE}/api/order/${id24}/receipt.pdf`
      : `/api/order/${id24}/receipt.pdf`;

    console.log("🌐 Requesting PDF from:", url);

    const response = await fetch(url, { method: "GET", headers });
    console.log("📡 Response status:", response.status);

    if (!response.ok) {
      let errorMessage;
      try {
        const err = await response.json();
        errorMessage = err?.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      console.error("❌ API Error:", errorMessage);
      throw new Error(`Failed to download receipt: ${errorMessage}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/pdf")) {
      console.error("❌ Invalid content type:", contentType);
      throw new Error("Server did not return a PDF file");
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error("Received empty PDF file");

    console.log("✅ PDF received, size:", blob.size, "bytes");

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;

    // filename from header or default
    let filename = "ai-tripper-receipt.pdf";
    const cd = response.headers.get("content-disposition");
    if (cd) {
      const m = cd.match(/filename="?([^"]+)"?/);
      if (m) filename = m[1];
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    console.log("✅ Receipt downloaded successfully");
    return true;
  } catch (error) {
    console.error("❌ Download receipt error:", error);

    let userMessage = "Failed to download receipt. ";
    const msg = String(error?.message || "");
    if (msg.includes("logged in")) userMessage += "Please log in and try again.";
    else if (msg.includes("required")) userMessage += "Order ID missing.";
    else if (msg.includes("Invalid order ID")) userMessage += "Order not found.";
    else if (msg.includes("400")) userMessage += "Invalid order ID.";
    else if (msg.includes("404")) userMessage += "Order not found.";
    else if (msg.includes("401")) userMessage += "Please log in again.";
    else userMessage += "Please try again later.";

    alert(userMessage);
    throw error;
  }
};
