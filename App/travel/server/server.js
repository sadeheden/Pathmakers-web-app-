import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

import authRouter from './services/auth/auth.router.js';
import orderRouter from './services/orders/order.router.js'; // <-- הוספת ה-import של ההזמנות
import { connectDB } from './services/auth/auth.db.js';

// Middleware לאימות JWT
function authenticateUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: 'Unauthorized - no token' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized - no token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized - invalid token' });
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/orders', orderRouter);  // <-- החיבור ל־orders

app.get('/', (req, res) => {
  res.send('API is running');
});
app.get('/api', (req, res) => {
  res.send('API base path is working');
});
// פרופיל משתמש
app.get('/api/user/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    const db = await connectDB();
    const usersCol = db.collection('Users');
    const tripsCol = db.collection('orders');

    const user = await usersCol.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    const trips = await tripsCol.find({ user_id: new ObjectId(userId) }).toArray();

    res.json({ user, trips });
  } catch (error) {
    console.error('Error in /api/user/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});

