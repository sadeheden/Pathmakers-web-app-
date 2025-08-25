import { useState, useEffect, useCallback, useRef } from "react";
import Markdown from "react-markdown";
import "../assets/styles/realChat.css";

// Read base URL from env, fallback to localhost
const API_BASE = (import.meta?.env?.VITE_API_BASE || "http://localhost:4000").replace(/\/$/, "");

export default function RealChat() {
  // state
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    { role: "system", content: "Act as a travel agent. Answer questions with full explanations and step-by-step thinking." },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  // ui helpers
  const quickReplies = ["Flights", "Hotels", "Tours", "Packing tips", "Visa info"];

  // refs for scroll control
  const chatRef = useRef(null);
  const didInitialPaint = useRef(false);

  // prevent browser restoring scroll + force top
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (e) {}
    window.scrollTo(0, 0);
  }, []);

  // allow auto-scroll only after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      didInitialPaint.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function scrollChatToBottom(behavior = "auto") {
    if (!chatRef.current || !didInitialPaint.current) return;
    try {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    } catch (e) {}
    // or smooth:
    // chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior });
  }

  // call backend
  const askAI = useCallback(async () => {
    try {
      setIsTyping(true);

      // Optional: send all messages (server sanitizes), or filter out system here:
      const outbound = messages.filter(m => m.role !== "system"); // or: messages.filter(m => m.role !== "system")

      const resp = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outbound }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson?.error || `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      const data = await resp.json();

      if (data?.choices?.length) {
        setMessages((prev) => [...prev, data.choices[0].message]);
      } else {
        const msg = data?.error || "No valid response from AI";
        throw new Error(msg);
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry, an error occurred: ${error.message}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [messages]);

  // trigger AI after user message
  useEffect(() => {
    if (messages.length > 1 && messages[messages.length - 1].role === "user") {
      askAI();
    }
  }, [messages, askAI]);

  // scroll when content grows (not on first render)
  useEffect(() => {
    if (!didInitialPaint.current) return;
    scrollChatToBottom("auto");
  }, [messages, isTyping]);

  // handlers
  function handleSend() {
    if (text.trim() !== "") {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setText("");
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickReply(reply) {
    setMessages((prev) => [...prev, { role: "user", content: reply }]);
  }

  return (
    <div className="real-chat">
      <div className="ai-triper-header-real-chat">Real Chat</div>
      <div className="subtitle-real-chat">
        AI PathMakers — your travel sidekick that plans your trip, suggests cool spots, and answers all your questions.
      </div>

      {/* QUICK REPLIES — moved ABOVE chat */}
      <div className="quick-replies-real-chat quick-replies-top">
        {quickReplies.map((reply, i) => (
          <button key={i} onClick={() => handleQuickReply(reply)}>
            {reply}
          </button>
        ))}
      </div>

      {/* CHAT */}
      <div className="chat-box-real-chat" ref={chatRef}>
        {messages
          .filter((m) => m.role !== "system")
          .map((message, index) => (
            <div
              key={index}
              className={`message-container-real-chat ${
                message.role === "user" ? "message-user-real-chat" : "message-bot-real-chat"
              }`}
            >
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

      {/* INPUT — prettier pill, clear, and stronger focus ring */}
      <div className="input-container-real-chat pretty-input">
        <input
          type="text"
          className="chat-input-real-chat"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about flights, hotels, visas…"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="Type your message"
        />
        {text && (
          <button
            type="button"
            className="input-clear"
            onClick={() => setText("")}
            aria-label="Clear text"
            title="Clear"
          >
            ×
          </button>
        )}
        <button
          className="button-real-chat send-btn"
          onClick={handleSend}
          disabled={!text.trim()}
          aria-label="Send message"
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
