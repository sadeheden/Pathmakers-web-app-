import fetch from 'node-fetch';

export async function getChatCompletion(messages) {
  try {
    const response = await fetch("https://api.endpoints.huggingface.cloud/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "HuggingFaceH4/zephyr-7b-beta", // ✅ Reliable working chat model
        messages,
        temperature: 0.5,
        max_tokens: 2048,
        top_p: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ HF API error:", JSON.stringify(data, null, 2));
      throw new Error(data?.error || "Hugging Face API error");
    }

    return data;
  } catch (error) {
    console.error("❌ getChatCompletion error:", error.message || error);
    throw error; // Pass to controller
  }
}
