import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';


dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3001;

// ✅ Middleware FIRST
app.use(cors());
app.use(express.json());


// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
