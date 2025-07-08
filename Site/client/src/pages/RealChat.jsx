import { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { HfInference } from "@huggingface/inference";
import { RingLoader } from "react-spinners";
import "../assets/styles/realChat.css";

export default function RealChat() {
  const [token] = useState(import.meta.env.VITE_HF_TOKEN);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Act as a travel agent. Answer questions with full explanations and step-by-step thinking.",
    },
  ]);
  const [showLoading, setShowLoading] = useState(false);

  const askAI = useCallback(async () => {
    try {
      const client = new HfInference(token);

      const answer = await client.chatCompletion({
        model: "meta-llama/Llama-3.2-3B-Instruct",
        messages,
        temperature: 0.5,
        max_tokens: 2048,
        top_p: 0.7,
      });

      setMessages((prevMessages) => [
        ...prevMessages,
        answer.choices[0].message,
      ]);
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "מצטער, אירעה שגיאה. אנא נסה שוב.",
        },
      ]);
    } finally {
      setShowLoading(false);
    }
  }, [messages, token]);

  useEffect(() => {
    if (
      messages.length > 1 &&
      messages[messages.length - 1].role === "user"
    ) {
      setShowLoading(true);
      askAI();
    }
  }, [messages, askAI]);

  const handleSend = () => {
    if (text.trim() !== "") {
      setMessages([...messages, { role: "user", content: text }]);
      setText("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="realChat">
      {/* טקסט AI TRIPER למעלה */}
      <div className="ai-triper-header">Real Chat</div>

      <h1 className="realChat">
AI TRIPER — your travel sidekick that plans your trip, suggests cool spots, and answers all your questions.

      </h1>

      {/* ריבוע ההודעות */}
      <div className="chat-box">
        {messages
          .filter((m) => m.role !== "system")
          .map((message, index) => (
            <div
              key={index}
              className={`message-container message ${
                message.role === "user" ? "user" : "bot"
              }`}
            >
              <div className="markdown-content">
                <Markdown>{message.content}</Markdown>
              </div>
            </div>
          ))}
      </div>

      {/* שורת הקלט */}
      <div className="input-container">
        <input
          type="text"
          className="realChat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="הקלד הודעה..."
          disabled={showLoading}
        />
        <button 
          className="realChat" 
          onClick={handleSend}
          disabled={showLoading || !text.trim()}
        >
          שליחה
        </button>
      </div>

      {/* טוען */}
      {showLoading && (
        <div id="loader" className="realChat">
          <RingLoader color="#6633cc" size={60} />
        </div>
      )}
    </div>
  );
}
