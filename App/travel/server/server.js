import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

import authRouter from './services/auth/auth.router.js';
import orderRouter from './services/orders/order.router.js';
import { connectDB } from './services/auth/auth.db.js';

// ----- Load environment variables -----
// טען רק את קובץ הסביבה המתאים (לדוגמה .env.local)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// ----- Middleware לאימות JWT -----
function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized - invalid token' });
  }
}

// ----- Express app setup -----
const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ----- Routes -----
app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);


// בסיסי
app.get('/', (req, res) => {
  res.send('API is running');
});
app.get('/api', (req, res) => {
  res.send('API base path is working');
});

// פרופיל משתמש עם הזמנות
app.get('/api/user/me', authenticateUser, async (req, res) => {
  try {
    // שים לב: ב־JWT payload שומר את ה-id בשדה userId (בדוק שזה אכן שם המפתח)
    const userId = req.user.userId || req.user.id;

    const db = await connectDB();
    const usersCol = db.collection('Users');
    const ordersCol = db.collection('orders');

  const user = await usersCol.findOne(
  { _id: new ObjectId(String(userId)) },
  { projection: { password: 0 } }
);


    if (!user) return res.status(404).json({ message: 'User not found' });

   const orders = await ordersCol.find({ user_id: new ObjectId(String(userId)) }).toArray();


    res.json({ user, orders });
  } catch (error) {
    console.error('Error in /api/user/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ----- Start server -----
app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
