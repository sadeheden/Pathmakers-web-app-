import { useState, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { RingLoader } from "react-spinners";
import "../assets/styles/realChat.css";

export default function RealChat() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Act as a travel agent. Answer questions with full explanations and step-by-step thinking.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const askAI = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      });

      const data = await response.json();

      if (data.choices && data.choices.length > 0) {
        setMessages((prevMessages) => [
          ...prevMessages,
          data.choices[0].message,
        ]);
      } else {
        throw new Error("No valid response from AI");
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: "assistant",
          content: "Sorry, an error occurred. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  useEffect(() => {
    if (
      messages.length > 1 &&
      messages[messages.length - 1].role === "user"
    ) {
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
      {/* Header */}
      <div className="ai-triper-header">Real Chat</div>

      <h1 className="realChat">
        AI TRIPER — your travel sidekick that plans your trip, suggests cool
        spots, and answers all your questions.
      </h1>

      {/* Chat box */}
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

      {/* Input */}
      <div className="input-container">
        <input
          type="text"
          className="realChat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isLoading}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
        <button
          className="realChat"
          onClick={handleSend}
          disabled={isLoading || !text.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>

      {/* Loader */}
      {isLoading && (
        <div id="loader" className="realChat">
          <RingLoader color="#6633cc" size={60} />
        </div>
      )}
    </div>
  );
}
