// server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';

// ⚡ Load environment variables FIRST
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });
const envPath = path.resolve(__dirname, '.env.local');
console.log('🔎 Expo server env:',
  JSON.stringify({
    loadedFrom: __dirname,
    PORT: process.env.PORT,
    HF_TOKEN_present: Boolean(process.env.HF_TOKEN),
    HF_MODEL: process.env.HF_MODEL || '(not set)',
  }, null, 2)
);
if (!fs.existsSync(envPath)) {
  console.warn(`⚠️ .env.local file not found at ${envPath}`);
}
dotenv.config({ path: envPath });
console.log('Loaded CONNECTION_STRING:', process.env.CONNECTION_STRING);
console.log('Loaded DB_NAME:', process.env.DB_NAME);

// ✅ Import routes AFTER environment is loaded
import authRoutes from './services/auth/auth.router.js';
import orderRoutes from './services/orders/order.router.js';
import attRoutes from './services/attractions/att.router.js';
import supportRoutes from "./services/support/support.routes.js"; 
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/attractions', attRoutes);
app.use('/api/support', supportRoutes);
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
