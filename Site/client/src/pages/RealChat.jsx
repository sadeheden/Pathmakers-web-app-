import { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import "../assets/styles/realChat.css";

export default function RealChat() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    { role: "system", content: "Act as a travel agent. Answer questions with full explanations and step-by-step thinking." },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const quickReplies = ["Flights", "Hotels", "Tours", "Packing tips", "Visa info"];

  const askAI = useCallback(async () => {
    try {
      setIsTyping(true);
      const response = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setMessages(prev => [...prev, data.choices[0].message]);
      } else {
        throw new Error("No valid response from AI");
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, an error occurred. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 1 && messages[messages.length - 1].role === "user") {
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

  const handleQuickReply = (reply) => {
    setMessages([...messages, { role: "user", content: reply }]);
  };

  return (
    <div className="real-chat">
      <div className="ai-triper-header-real-chat">Real Chat</div>
      <div className="subtitle-real-chat">
        AI TRIPER — your travel sidekick that plans your trip, suggests cool spots, and answers all your questions.
      </div>

      <div className="chat-box-real-chat">
        {messages.filter(m => m.role !== "system").map((message, index) => (
          <div key={index} className={`message-container-real-chat ${message.role === "user" ? "message-user-real-chat" : "message-bot-real-chat"}`}>
            <div className="markdown-content-real-chat">
              <Markdown>{message.content}</Markdown>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-container-real-chat message-bot-real-chat">
            <span className="typing-dot-real-chat"></span>
            <span className="typing-dot-real-chat"></span>
            <span className="typing-dot-real-chat"></span>
          </div>
        )}
      </div>

      <div className="quick-replies-real-chat">
        {quickReplies.map((reply, i) => (
          <button key={i} onClick={() => handleQuickReply(reply)}>{reply}</button>
        ))}
      </div>

      <div className="input-container-real-chat">
        <input
          type="text"
          className="chat-input-real-chat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button className="button-real-chat" onClick={handleSend} disabled={!text.trim()} aria-label="Send message">➤</button>
      </div>
    </div>
  );
}
