import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';

dotenv.config();

console.log("🌿 Loaded ENV variables:");
console.log("🔗 CONNECTION_STRING:", process.env.CONNECTION_STRING);
console.log("🗄️ DB_NAME:", process.env.DB_NAME);
console.log("🔐 JWT_SECRET_KEY:", process.env.JWT_SECRET_KEY ? "[OK]" : "[MISSING]");
console.log("🤖 HF_TOKEN:", process.env.HF_TOKEN ? "[OK]" : "[MISSING]");
// 📦 ייבוא ראוטים
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';
import orderRouter from './services/order/order.router.js';
import uploadRouter from './services/upload/upload.router.js'; 
import managerRouter from './services/manager/manager.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 🧱 Middlewares
app.use(cors());
app.use(express.json());

// 🌐 בדיקת חיבור ראשוני
app.get('/', (req, res) => {
  res.send('🌍 PathMakers API is running!');
});
// 🤖 Proxy Hugging Face chat request
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await hf.chatCompletion({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages,
    });
    res.json(response);
  } catch (err) {
    console.error("❌ HF Error:", err);
    res.status(500).json({ error: 'Failed to fetch chat response' });
  }
});

// 📦 רישום ראוטים
app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/order', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manager', managerRouter);

// 🛑 טיפול ב-404
app.use((req, res, next) => {
  res.status(404).json({ error: '🔍 Route not found', path: req.originalUrl });
});

// 🧯 טיפול בשגיאות 500
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 🚀 הרצת השרת
app.listen(PORT, () => {
  console.log(`🚀 Server listening at: http://localhost:${PORT}`);
});
