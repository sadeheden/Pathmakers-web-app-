import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';



import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });


const app = express();
const port = process.env.PORT || 3001;

// ✅ Middleware FIRST
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
