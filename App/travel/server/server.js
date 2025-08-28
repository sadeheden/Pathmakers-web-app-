// server.js
import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import express from "express";
import cors from "cors";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load base first, then override with .env.local if present
dotenv.config({ path: path.join(__dirname, ".env") });
const localPath = path.join(__dirname, ".env.local");
if (fs.existsSync(localPath)) dotenv.config({ path: localPath });

console.log("🔎 Expo server env:", JSON.stringify({
  loadedFrom: __dirname,
  PORT: process.env.PORT,
  HF_TOKEN_present: !!process.env.HF_TOKEN,
  HF_MODEL: process.env.HF_MODEL || "(not set)",
}, null, 2));

// Optional: guard rails for required vars used by your DB layer
if (!process.env.CONNECTION_STRING) console.warn("⚠️ CONNECTION_STRING is not set");
if (!process.env.DB_NAME) console.warn("⚠️ DB_NAME is not set");

// Import routes
import authRoutes from "./services/auth/auth.router.js";
import orderRoutes from "./services/orders/order.router.js";
import attRoutes from "./services/attractions/att.router.js";
import supportRoutes from "./services/support/support.routes.js";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Middleware לוגים עבור כל בקשה
app.use((req, res, next) => {
  console.log("📌 Incoming request:");
  console.log("  Method:", req.method);
  console.log("  URL:", req.originalUrl);
  if (req.method === "POST" || req.method === "PUT") {
    console.log("  Body:", JSON.stringify(req.body, null, 2));
  }

  // לוג תשובה
  const oldSend = res.send;
  res.send = function (data) {
    console.log("✅ Response for", req.method, req.originalUrl, ":", data.toString());
    oldSend.apply(res, arguments);
  };

  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/attractions", attRoutes);
app.use("/api/support", supportRoutes);

// Start server
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
