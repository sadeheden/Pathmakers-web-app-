import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config(); // טעינת משתני סביבה

// ייבוא ראוטים לפי השירותים בפרויקט
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 🧱 Middlewares
app.use(cors());
app.use(express.json());

// 🌐 בדיקת חיבור ראשוני
app.get('/', (req, res) => {
  res.send('🌍 PathMakers API is running!');
});

// 📦 רישום ראוטים
app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);

// 🛑 טיפול בנתיבים לא קיימים (404)
app.use((req, res, next) => {
  res.status(404).json({ error: '🔍 Route not found', path: req.originalUrl });
});

// 🧯 טיפול בשגיאות כלליות (500)
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 🚀 הרצת השרת
app.listen(PORT, () => {
  console.log(`🚀 Server listening at: http://localhost:${PORT}`);
});
