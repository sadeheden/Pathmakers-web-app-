import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HF_TOKEN);

export async function getChatCompletion(messages) {
  try {
    return await hf.chatCompletion({
      model: 'meta-llama/llama-3.1-8b-instruct',
      provider: 'huggingface',
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7,
    });
  } catch (error) {
    console.error("❌ HF chatCompletion error:", error);
    throw error; // מעביר את השגיאה ל-controller
  }
}
