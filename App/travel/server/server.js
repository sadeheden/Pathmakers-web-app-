// server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import express from 'express';
import cors from 'cors';

// ⚡ Load environment variables FIRST
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env.local');
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

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/attractions', attRoutes);

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
