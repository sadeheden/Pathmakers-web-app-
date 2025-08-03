// server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 👇 Load .env from the 'server' folder explicitly
dotenv.config({ path: path.resolve('./.env.local') });
dotenv.config({ path: path.resolve('./.env') });


import express from 'express';
import cors from 'cors';
import authRouter from './services/auth/auth.router.js';

// Debug: Check if env vars are loaded
console.log('🔧 Environment check:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'LOADED ✅' : 'MISSING ❌',
  CONNECTION_STRING: process.env.CONNECTION_STRING ? 'LOADED ✅' : 'MISSING ❌',
  PORT: process.env.PORT || 'DEFAULT'
});

const app = express();
const port = process.env.PORT || 3001;

// ✅ Middleware setup BEFORE routes
app.use(cors());
app.use(express.json());

// ✅ Route mounting
app.use('/api/auth', authRouter);

// Optional: test route
app.get('/', (req, res) => {
  res.send('API is running');
});

// ✅ Only ONE app.listen() call
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});