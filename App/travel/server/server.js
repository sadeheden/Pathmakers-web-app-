// server.js
import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import { loginUser } from './services/auth/auth.controller.js'; // תקני את הנתיב לפי מיקום הקובץ שלך

const app = express();
const port = process.env.PORT || 3000;

// middleware לקריאת JSON בבקשות POST
app.use(express.json());

// Route ל-login
app.post('/login', loginUser);

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
