/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  CHATBOT MAIN COMPONENT                                 ║
 * ║  OWNER: UI Lead                                         ║
 * ║  BRANCH: feature/chatbot-core (base branch)             ║
 * ║  ── DO NOT MODIFY in feature branches ──                ║
 * ╚══════════════════════════════════════════════════════════╝
 *
 * Responsibilities:
 *   - Floating button + slide-in panel UI
 *   - Fetch /api/v1/chatbot/context on open (one-shot bundle)
 *   - Maintain messages[] and pending state
 *   - Pass ctx to routeMessage() and render the response
 *   - Render different bubble types: text, preview, dashboard, laundry
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { routeMessage } from './router.js';
import './ChatBot.css';

// ─── Types of bot responses ───────────────────────────────────────────────────
// 'text'      → plain text bubble
// 'preview'   → structured card with key-value pairs + action buttons
// 'dashboard' → sectioned status overview
// 'laundry'   → slot cards
// 'error'     → red-tinted error bubble

const WELCOME_MSG = {
  id: 'welcome',
  from: 'bot',
  type: 'text',
  text: `👋 Hi, I'm **SmartHostel AI** — your personal hostel assistant.\n\nYou can ask me:\n• "Show my status"\n• "I want to go home this weekend"\n• "Fan not working in my room"\n• "Is the mess crowded now?"\n• "Can I go out right now?"`,
  timestamp: new Date(),
};

export default function ChatBot() {
  const { user } = useAuthStore();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [session, setSession]   = useState(null);   // fetched context bundle
  const [pending, setPending]   = useState(null);   // multi-step state
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  // ── Fetch context bundle once when chatbot opens ──────────────────────────
  useEffect(() => {
    if (open && !session) {
      fetchContext();
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContext = async () => {
    try {
      const data = await api.get('/chatbot/context');
      setSession(data);
    } catch {
      // Fallback: use basic user data from auth store
      setSession({
        user,
        complaints: [],
        gatepass: [],
        attendance: { present: 0, absent: 0, rate: 0 },
        laundry: null,
        mess: { crowd_level: 'Unknown', recommendation: '' },
      });
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (messageText) => {
    const text = (messageText || input).trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now(), from: 'user', type: 'text', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate short typing delay for UX
    await new Promise((r) => setTimeout(r, 600));

    try {
      const ctx = {
        user,
        message: text,
        session: session || {},
        pending,
        api,
        now: new Date(),
      };

      const response = routeMessage(text, ctx);

      // Handle pending state updates
      if (response.nextPending !== undefined) setPending(response.nextPending);
      if (response.clearPending) setPending(null);

      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        timestamp: new Date(),
        ...response,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: Date.now() + 1, from: 'bot', type: 'error',
        text: 'Something went wrong. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, user, session, pending]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render a single bubble ────────────────────────────────────────────────
  const renderBubble = (msg) => {
    if (msg.from === 'user') {
      return (
        <div key={msg.id} className="chat-bubble-row user">
          <div className="chat-bubble user-bubble">
            {msg.text}
          </div>
        </div>
      );
    }

    return (
      <div key={msg.id} className="chat-bubble-row bot">
        <div className="bot-avatar">🤖</div>
        <div className="chat-bubble-content">
          {/* Text bubble (default) */}
          {(msg.type === 'text' || msg.type === 'error') && (
            <div className={`chat-bubble bot-bubble ${msg.type === 'error' ? 'error-bubble' : ''}`}>
              <FormattedText text={msg.text} />
            </div>
          )}

          {/* Preview card (for leave/complaint confirmation) */}
          {msg.type === 'preview' && (
            <div className="chat-preview-card">
              <div className="preview-header">{msg.text}</div>
              <div className="preview-rows">
                {Object.entries(msg.preview || {}).map(([k, v]) => (
                  <div key={k} className="preview-row">
                    <span className="preview-key">{k}</span>
                    <span className="preview-val">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashboard view */}
          {msg.type === 'dashboard' && (
            <div className="chat-dashboard">
              <div className="dashboard-header">{msg.text}</div>
              {(msg.sections || []).map((sec, i) => (
                <div key={i} className="dashboard-section">
                  <div className="dashboard-section-title">{sec.icon} {sec.title}</div>
                  {(sec.items || []).map((item, j) => (
                    <div key={j} className="dashboard-item">{item}</div>
                  ))}
                  {sec.alert && (
                    <div className="dashboard-alert">⚠️ {sec.alert}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Laundry slots */}
          {msg.type === 'laundry' && (
            <div className="chat-laundry">
              <div className="laundry-header">{msg.text}</div>
              {(msg.slots || []).map((slot, i) => (
                <div key={i} className="laundry-slot">
                  <div className="laundry-label">{slot.label}</div>
                  <div className="laundry-day">{slot.day} · {slot.time}</div>
                  {slot.daysAway === 0 && <div className="laundry-today">TODAY!</div>}
                  {slot.daysAway === 1 && <div className="laundry-soon">Tomorrow</div>}
                  {slot.alert && <div className="dashboard-alert">{slot.alert}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Quick action buttons */}
          {msg.actions && msg.actions.length > 0 && (
            <div className="chat-actions">
              {msg.actions.map((action, i) => (
                <button
                  key={i}
                  className="chat-action-btn"
                  onClick={() => sendMessage(action.value || action.label)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div className="chat-timestamp">
            {msg.timestamp?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── Floating Toggle Button ── */}
      <button
        id="chatbot-toggle-btn"
        className={`chatbot-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open SmartHostel AI Assistant"
        title="SmartHostel AI"
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* ── Chat Panel ── */}
      <div className={`chatbot-panel ${open ? 'visible' : ''}`} role="dialog" aria-label="SmartHostel AI Chatbot">
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar">🤖</div>
            <div>
              <div className="chatbot-title">SmartHostel AI</div>
              <div className="chatbot-subtitle">
                {session ? '🟢 Connected' : '⏳ Loading context...'}
              </div>
            </div>
          </div>
          <button className="chatbot-close-btn" onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map(renderBubble)}

          {/* Typing indicator */}
          {loading && (
            <div className="chat-bubble-row bot">
              <div className="bot-avatar">🤖</div>
              <div className="chat-bubble bot-bubble typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-area">
          <input
            ref={inputRef}
            id="chatbot-input"
            className="chatbot-input"
            type="text"
            placeholder="Ask me anything about the hostel..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoComplete="off"
          />
          <button
            id="chatbot-send-btn"
            className="chatbot-send-btn"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Backdrop on mobile */}
      {open && <div className="chatbot-backdrop" onClick={() => setOpen(false)} />}
    </>
  );
}

// ── Helper: render markdown-lite bold text ────────────────────────────────────
function FormattedText({ text }) {
  if (!text) return null;
  // Convert **bold** and newlines
  const parts = text.split(/(\*\*[^*]+\*\*|\n)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part === '\n') return <br key={i} />;
        return part;
      })}
    </span>
  );
}
