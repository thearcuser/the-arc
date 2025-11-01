import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  MessageCircle,
  X,
  Send,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import "./Chatbot.css";

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      content:
        "👋 Hi! I'm The Arc Assistant. I can help you with platform features, pitch video tips, startup funding news, and more. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedQuestions = [
    "How does the swipe feature work?",
    "Tips for creating a great pitch video",
    "How to connect with investors?",
    "What makes a good startup pitch?",
    "Current trending startup domains",
    "How to find the right cofounder?",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      type: "user",
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText.trim(),
          chatHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const botMessage = {
        type: "bot",
        content: data.response,
        timestamp: new Date(),
        suggestions: data.suggestions || [],
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        type: "bot",
        content:
          "I'm sorry, I encountered an error. Please try again or check if the backend server is running.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        type: "bot",
        content:
          "👋 Hi! I'm The Arc Assistant. I can help you with platform features, pitch video tips, startup funding news, and more. How can I assist you today?",
        timestamp: new Date(),
      },
    ]);
    setInputValue("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="chatbot-toggle"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div className="chatbot-avatar">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>
                  The Arc Assistant
                </h3>
                <span style={{ fontSize: "0.85rem", opacity: 0.9 }}>
                  Online
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleReset}
                className="chatbot-reset-btn"
                title="Reset conversation"
              >
                <RotateCcw size={18} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="chatbot-reset-btn"
                title="Close chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message message-${message.type}`}>
                <div className="message-content">
                  <ReactMarkdown
                    components={{
                      // Customize how markdown elements are rendered
                      p: ({ children }) => <p style={{ marginBottom: '0.5rem' }}>{children}</p>,
                      strong: ({ children }) => (
                        <strong style={{ fontWeight: 700, color: message.type === 'bot' ? '#CF9FFF' : 'inherit' }}>
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em style={{ fontStyle: 'italic' }}>{children}</em>
                      ),
                      ul: ({ children }) => (
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ol>
                      ),
                      li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
                      code: ({ inline, children }) =>
                        inline ? (
                          <code style={{ 
                            backgroundColor: message.type === 'bot' ? '#f3f4f6' : 'rgba(255,255,255,0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontFamily: "'Courier New', Courier, monospace"
                          }}>
                            {children}
                          </code>
                        ) : (
                          <code style={{
                            display: 'block',
                            backgroundColor: message.type === 'bot' ? '#f3f4f6' : 'rgba(255,255,255,0.2)',
                            padding: '0.5rem',
                            borderRadius: '6px',
                            margin: '0.5rem 0',
                            fontSize: '0.875rem',
                            fontFamily: "'Courier New', Courier, monospace"
                          }}>
                            {children}
                          </code>
                        ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                  <span className="message-time">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Suggestions */}
                {message.type === "bot" &&
                  message.suggestions &&
                  message.suggestions.length > 0 && (
                    <div className="suggestions-container">
                      <div className="suggestions-grid">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(suggestion)}
                            className="suggestion-chip"
                            disabled={isLoading}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="message message-bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions (shown when only welcome message) */}
          {messages.length === 1 && (
            <div className="initial-suggestions" style={{ padding: '0 1.5rem 1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.5rem', fontWeight: 500 }}>
                Quick questions to get started:
              </p>
              <div className="suggestions-grid">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    className="suggestion-chip"
                    disabled={isLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="chatbot-input-container">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="chatbot-input"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="chatbot-send-btn"
              aria-label="Send message"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;