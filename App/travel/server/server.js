import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { HfInference } from '@huggingface/inference';

dotenv.config({ path: '.env.local' });

const app = express();
const port = process.env.PORT || 3001;
console.log("HF_TOKEN:", process.env.HF_TOKEN ? "✔️" : "❌");

const hf = new HfInference(process.env.HF_TOKEN);

app.use(cors());
app.use(express.json());

// ראוט של שיחת AI (במקום לפצל לקבצים נפרדים)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

      const response = await hf.chatCompletion({
      model: 'TheBloke/vicuna-7b-1.1-HF', // מודל נתמך בפועל
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });
    res.json(response);
  } catch (err) {
    console.error('❌ Hugging Face API error:', err);
    res.status(500).json({ error: 'Failed to fetch chat response' });
  }
});

// שאר הראוטים
import authRouter from './services/auth/auth.router.js';
import orderRouter from './services/orders/order.router.js';
import authenticateUser from './services/middlewares/authenticateUser.js';

app.use('/api/auth', authRouter);
app.use('/api/orders', authenticateUser, orderRouter);

app.listen(port, () => {
  console.log(`✅ Server is running on port ${port}`);
});
