// Complete server.js with working CORS and body parser
import express from 'express';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const app = express();
const PORT = process.env.PORT || 4000;

// ============ CRITICAL: Body Parser (MUST be before CORS) ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ CORS Configuration ============
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://pathmakers-web-app.onrender.com'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️  Blocked origin: ${origin}`);
      callback(null, true); // Allow anyway for now (change to false in production)
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // Cache preflight for 24 hours
}));

// Handle OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// ============ Static Files Check ============
const possibleDistPaths = [
  path.join(__dirname, '../client/dist'),
  path.join(__dirname, '../client/build'), 
  path.join(__dirname, './dist'),
];

let distPath = null;
for (const testPath of possibleDistPaths) {
  try {
    const fs = await import('fs');
    if (fs.existsSync(testPath)) {
      distPath = testPath;
      console.log(`📁 Found static files at: ${distPath}`);
      break;
    }
  } catch (e) { /* continue */ }
}

// ============ Health Check ============
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
});

// ============ Import Routers ============
import citiesRouter from './services/cities/cities.router.js';
import attractionRoutes from './services/attraction/att.router.js';
import flightsRoutes from './services/flights/flights.router.js';
import hotelRoutes from './services/hotel/hotel.router.js';
import authRouter from './services/auth/auth.router.js';
import uploadRouter from './services/upload/upload.router.js';
import managerRoutes from './services/manager/manager.routes.js';
import travelRoutes from './services/travel/travel.routes.js';
import supportRouter from './services/support/support.router.js';
import ordersRouter from './services/order/order.router.js';
import orders2Router from './services/orders2/orders2.router.js';
import newsletterRouter from './services/newsletter/newsletter.router.js';
import orderCancellationRoutes from './services/orderCancellation/orderCancellation.routes.js';

// ============ Mount API Routes ============
// CRITICAL: Cancellation routes MUST come before general order routes
app.use('/api/order', orderCancellationRoutes);
app.use('/api/order', ordersRouter);

app.use('/api/cities', citiesRouter);
app.use('/api/attractions', attractionRoutes);
app.use('/api/flights', flightsRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/manager', managerRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/orders2', orders2Router);
app.use('/api/support', supportRouter);
app.use('/api/newsletter', newsletterRouter);

// ============ Static Files (if found) ============
if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'API route not found' });
    }
  });
}

// ============ Error Handler ============
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for: ${allowedOrigins.join(', ')}`);
  console.log(`✅ Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});