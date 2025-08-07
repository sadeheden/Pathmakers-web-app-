
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import fetch from 'node-fetch';


dotenv.config({ path: '.env.local' });

// Debugging helpers:
console.log("📂 Checking .env.local exists:", fs.existsSync('.env.local') ? "✅ Yes" : "❌ No");

console.log("📄 Raw .env.local content:");
console.log(fs.readFileSync('.env.local', 'utf8'));

console.log("🔑 Parsed HF_TOKEN:", process.env.HF_TOKEN ? `✔️ ${process.env.HF_TOKEN.slice(0, 10)}...` : "❌ Not loaded");


const app = express();
const port = process.env.PORT || 3001;
console.log("HF_TOKEN:", process.env.HF_TOKEN ? "✔️" : "❌");




app.use(cors());
app.use(express.json());

// ראוט של שיחת AI (במקום לפצל לקבצים נפרדים)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    console.log("📥 Incoming /api/chat request with messages:");
    console.log(JSON.stringify(messages, null, 2));

    if (!messages || !Array.isArray(messages)) {
      console.warn("⚠️ Invalid messages format:", messages);
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const hfRes = await fetch("https://api.endpoints.huggingface.cloud/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "HuggingFaceH4/zephyr-7b-beta",
        messages,
        temperature: 0.5,
        max_tokens: 2048,
        top_p: 0.7
      })
    });

    const data = await hfRes.json();

    if (!hfRes.ok) {
      console.error("❌ Hugging Face API error:");
      console.error("📛 Status:", hfRes.status);
      console.error("📛 Response:", JSON.stringify(data, null, 2));
      return res.status(hfRes.status).json({ error: data });
    }

    console.log("✅ Hugging Face response:");
    console.log(JSON.stringify(data, null, 2));

    res.json(data);
  } catch (err) {
    console.error("❌ Unhandled server error:", err.message || err);
    res.status(500).json({ error: 'Internal server error' });
 }
});