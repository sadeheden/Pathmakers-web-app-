import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';


// 🚀 טוען משתני סביבה
dotenv.config();

// ✅ יצירת מופע של Hugging Face Client
const hf = new HfInference(process.env.HF_TOKEN);

// ✅ יצירת אפליקציית אקספרס
const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Middlewares
app.use(cors({ origin: 'http://localhost:5173' })); // מתיר קריאות מה-React
app.use(express.json());

// ✅ בדיקת חיבור
app.get('/', (req, res) => {
  res.send('🌍 PathMakers API is running!');
});

// ✅ ראוט לשיחה עם Hugging Face
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await hf.chatCompletion({
      model: 'meta-llama/Llama-3.1-8B-Instruct',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });

    res.json(response);
  } catch (err) {
    console.error("❌ HF Error:", err);
    res.status(500).json({ error: 'Failed to fetch chat response' });
  }
});

// ✅ ראוטים נוספים - אם יש לך מודולים אחרים
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';
import orderRouter from './services/order/order.router.js';
import uploadRouter from './services/upload/upload.router.js';
import managerRouter from './services/manager/manager.routes.js';
import newsletterRouter from './services/newsletter/newsletter.router.js';


app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/order', orderRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manager', managerRouter);
app.use('/api/newsletter', newsletterRouter);



// 🛑 טיפול ב-404
app.use((req, res, next) => {
  res.status(404).json({ error: '🔍 Route not found', path: req.originalUrl });
});

// 🧯 טיפול בשגיאות כלליות
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// 🚀 הרצת השרת
app.listen(PORT, () => {
  console.log(`🚀 Server listening at: http://localhost:${PORT}`);
});
