import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import chatRouter from './services/chat/chat.router.js';

dotenv.config({ path: '.env.local' });

// Debugging helpers:
console.log("📂 Checking .env.local exists:", fs.existsSync('.env.local') ? "✅ Yes" : "❌ No");

console.log("📄 Raw .env.local content:");
console.log(fs.readFileSync('.env.local', 'utf8'));

console.log("🔑 Parsed HF_TOKEN:", process.env.HF_TOKEN ? `✔️ ${process.env.HF_TOKEN.slice(0, 10)}...` : "❌ Not loaded");

const app = express();
const port = process.env.PORT || 3001;

// ✅ Middleware FIRST
app.use(cors());
app.use(express.json());

// ✅ Routes AFTER middleware
app.use('/api', chatRouter);

// Start server
app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
