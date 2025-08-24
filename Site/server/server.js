// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';


dotenv.config();

const hf = new HfInference(process.env.HF_TOKEN);
const app = express();
const PORT = process.env.PORT || 4000;

// ---------- Middleware ----------
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ---------- Healthcheck ----------
app.get('/', (req, res) => {
  res.send('🌍 PathMakers API is running!');
});

// ---------- Hugging Face chat ----------
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
    console.error('❌ HF Error:', err);
    res.status(500).json({ error: 'Failed to fetch chat response' });
  }
});

// ---------- Routers ----------
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';
import uploadRouter from './services/upload/upload.router.js';
import managerRoutes from './services/manager/manager.routes.js';
import travelRoutes from './services/travel/travel.routes.js';
import supportRouter from './services/support/support.router.js';
import ordersRouter from './services/order/order.router.js'; // רק זה נשאר
import orders2Router from './services/orders2/orders2.router.js';
import newsletterRouter from './services/newsletter/newsletter.router.js';
import supportRouter from './support/support.router.js';
// ---------- API Endpoints ----------
app.use('/api/cities', citiesRouter);          // כל הפעולות של cities רגילות
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manager', managerRoutes);
app.use('/api/travel/cities', travelRoutes);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/support', supportRouter);


// Travel routes – אין כפילויות
// עכשיו כל הנתיבים בתוך travelRoutes יחסיים ל-/api/travel
app.use('/api/travel', travelRoutes);

app.use('/api/order', ordersRouter);
app.use('/api/orders2', orders2Router);
app.use('/api/support', supportRouter);

// 🛑 טיפול ב-404
app.use((req, res, next) => {
  res.status(404).json({ error: '🔍 Route not found', path: req.originalUrl });
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`🚀 Server listening at: http://localhost:${PORT}`);
});
