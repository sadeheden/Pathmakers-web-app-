import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './services/auth/auth.router.js';
import orderRoutes from './services/orders/order.router.js';
import attRoutes from './services/attractions/att.router.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

// טען dotenv פעם אחת עם הנתיב המדויק של הקובץ שלך
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

console.log('Loaded CONNECTION_STRING:', process.env.CONNECTION_STRING);

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/attractions', attRoutes);

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
