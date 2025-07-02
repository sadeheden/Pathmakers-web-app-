import { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { HfInference } from "@huggingface/inference";
import { RingLoader } from "react-spinners";
import "../assets/styles/realChat.css";
 
export default function RealChat() {
  const [token] = useState(import.meta.env.VITE_HF_TOKEN);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    { role: "system", content: "Act as a travel agent. Answer questions with full explanations and step-by-step thinking." },
  ]);
  const [showLoading, setShowLoading] = useState(false);
 
  const askAI = useCallback(async () => {
    let client = new HfInference(token);
    
    const answer = await client.chatCompletion({
      model: "meta-llama/Llama-3.2-3B-Instruct",
      messages,
      temperature: 0.5,
      max_tokens: 2048,
      top_p: 0.7
    });
 
    setMessages((prevMessages) => [...prevMessages, answer.choices[0].message]);
    setShowLoading(false);
  }, [messages, token]);
 
  useEffect(() => {
    if (messages.length > 1 && messages[messages.length - 1].role === "user") {
      setShowLoading(true);
      askAI();
    }
  }, [messages, askAI]);
 
  return (
    <>
      <h1 className="realChat">Real Chat</h1>
 
      <div id="messages" className="realChat">
        {messages.map((message, index) => (
          <div key={index} className="message-container">
            <p><strong>{message.role}:</strong></p>
            <div className="markdown-content">
              <Markdown>{message.content}</Markdown>
            </div>
          </div>
        ))}
      </div>
 
      <input
        type="text"
        id="message"
        className="realChat"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Type a message..."
      />
 
      <button
        id="talk"
        className="realChat"
        onClick={() => text && setMessages([...messages, { role: 'user', content: text }])}
      >
        Talk
      </button>
 
      {showLoading && <div id="loader" className="realChat"><RingLoader color="#0790e8" /></div>}
    </>
  );
}
 