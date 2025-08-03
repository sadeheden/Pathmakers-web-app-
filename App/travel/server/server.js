// server.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

import authRouter from './services/auth/auth.router.js';


const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ Route mounting
app.use('/api/auth', authRouter);
router.post('/login', loginUser);

// Optional: test route
app.get('/', (req, res) => {
  res.send('API is running');
});
// in auth.router.js
router.get('/test', (req, res) => {
  res.send('Auth API is working!');
});


app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
