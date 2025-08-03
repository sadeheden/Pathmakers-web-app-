// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

import authRouter from '../services/auth/auth.router.js'; // ✅ Use your router file

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ Route mounting
app.use('/api/auth', authRouter);

// Optional: test route
app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
