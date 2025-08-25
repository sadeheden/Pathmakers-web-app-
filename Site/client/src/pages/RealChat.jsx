import { useState, useEffect, useCallback, useRef } from "react";
import Markdown from "react-markdown";
import "../assets/styles/realChat.css";

export default function RealChat() {
  // state
  let [text, setText] = useState("");
  let [messages, setMessages] = useState([
    { role: "system", content: "Act as a travel agent. Answer questions with full explanations and step-by-step thinking." },
  ]);
  let [isTyping, setIsTyping] = useState(false);

  // ui helpers
  let quickReplies = ["Flights", "Hotels", "Tours", "Packing tips", "Visa info"];

  // refs for scroll control
  let chatRef = useRef(null);
  let didInitialPaint = useRef(false);

  // prevent browser restoring scroll + force top
  useEffect(() => {
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (e) {}
    window.scrollTo(0, 0);
  }, []);

  // allow auto-scroll only after first paint
  useEffect(() => {
    let id = requestAnimationFrame(() => { didInitialPaint.current = true; });
    return () => cancelAnimationFrame(id);
  }, []);

  function scrollChatToBottom(behavior = "auto") {
    if (!chatRef.current || !didInitialPaint.current) return;
    try { chatRef.current.scrollTop = chatRef.current.scrollHeight; } catch (e) {}
    // or smooth:
    // chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior });
  }

  // call backend
  let askAI = useCallback(async () => {
    try {
      setIsTyping(true);
      let response = await fetch("http://localhost:4000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      let data = await response.json();
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
      setMessages(prev => [...prev, { role: "user", content: text }]);
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
    setMessages(prev => [...prev, { role: "user", content: reply }]);
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
          <button key={i} onClick={() => handleQuickReply(reply)}>{reply}</button>
        ))}
      </div>

      {/* CHAT */}
      <div className="chat-box-real-chat" ref={chatRef}>
        {messages.filter(m => m.role !== "system").map((message, index) => (
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
