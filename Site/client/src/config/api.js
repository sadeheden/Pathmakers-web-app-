

  export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE?.replace(/\/$/, "")) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_BASE?.replace(/\/$/, "")) ||
  (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:4000"
      : "");
