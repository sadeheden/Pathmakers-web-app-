import { getChatCompletion } from './chat.model.js';

export async function handleChat(req, res) {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const response = await getChatCompletion(messages);

    res.json(response);
  } catch (err) {
    console.error("❌ Hugging Face API error:", err);
    res.status(500).json({ error: 'Failed to fetch chat response' });
  }
}
