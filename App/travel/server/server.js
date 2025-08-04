import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';

import authRouter from './services/auth/auth.router.js';
import authenticateUser from './services/middlewares/authenticateUser.js';
import { connectDB } from './services/auth/auth.db.js'; 

// חשבון נתיבים ב-ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טוען קודם את .env.local מהתיקיה server
dotenv.config({ path: path.resolve(__dirname, '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🔧 Environment check:', {
  JWT_SECRET: process.env.JWT_SECRET ? 'LOADED ✅' : 'MISSING ❌',
  CONNECTION_STRING: process.env.CONNECTION_STRING ? 'LOADED ✅' : 'MISSING ❌',
  PORT: process.env.PORT || 'DEFAULT',
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);

// רוטת בדיקה בסיסית
app.get('/', (req, res) => {
  res.send('API is running');
});

// רוטת פרופיל - מחזירה את פרטי המשתמש והטיולים שלו
app.get('/api/user/me', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId; // מזהה המשתמש מ-JWT
    
    const db = await connectDB();
    const usersCol = db.collection('Users');
    const tripsCol = db.collection('ordres'); // אוסף הטיולים

    // שליפת פרטי המשתמש ללא סיסמה
    const user = await usersCol.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });

    // שליפת הטיולים לפי user_id (אם user_id הוא מחרוזת, תשאיר ככה)
    const trips = await tripsCol.find({ user_id: userId }).toArray();

    res.json({ user, trips });
  } catch (error) {
    console.error('Error in /api/user/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

console.log('🌍 CONNECTION_STRING =', process.env.CONNECTION_STRING);

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
