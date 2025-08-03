// server.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// חשבון נתיבים ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טוען קודם את .env.local מהתיקיה server
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// אם יש גם קובץ .env (אופציונלי)
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Debug: וידוא טעינת משתני סביבה
console.log('🔧 Environment check:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'LOADED ✅' : 'MISSING ❌',
  CONNECTION_STRING: process.env.CONNECTION_STRING ? 'LOADED ✅' : 'MISSING ❌',
  PORT: process.env.PORT || 'DEFAULT',
});

import express from 'express';
import cors from 'cors';
import authRouter from './services/auth/auth.router.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware לפני הרוטות
app.use(cors());
app.use(express.json());

// מחבר את הרוטות
app.use('/api/auth', authRouter);

// רוטת בדיקה
app.get('/', (req, res) => {
  res.send('API is running');
});

console.log('🌍 CONNECTION_STRING =', process.env.CONNECTION_STRING);

// הפעלת השרת
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
