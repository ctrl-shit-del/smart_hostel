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

const GATEPASS_TYPES = ['Outing', 'Leave', 'Hospital'];
const COMPLAINT_CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Other'];
const COMPLAINT_SEVERITIES = ['Urgent', 'Normal'];

function normalizeTimestamp(value) {
  if (value instanceof Date) return value;

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEnum(value, allowedValues) {
  const cleaned = sanitizeText(value);
  if (!cleaned) return null;

  for (const entry of allowedValues) {
    if (entry.toLowerCase() === cleaned.toLowerCase()) {
      return entry;
    }
  }

  for (const entry of allowedValues) {
    if (cleaned.toLowerCase().includes(entry.toLowerCase())) {
      return entry;
    }
  }

  return null;
}

function normalizeApiDate(value) {
  const cleaned = sanitizeText(value);
  if (!cleaned) return null;

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toISOString();
}

function isConfirmationMessage(value) {
  const cleaned = sanitizeText(value).toLowerCase();
  if (!cleaned) return false;

  return [
    'confirm',
    'confirm_submission',
    'confirm_leave',
    'submit',
    'submit complaint',
    'submit application',
    'yes',
  ].some((token) => cleaned === token || cleaned.includes(token));
}

function isCancellationMessage(value) {
  const cleaned = sanitizeText(value).toLowerCase();
  if (!cleaned) return false;

  return [
    'cancel',
    'no',
    'stop',
    'abort',
  ].some((token) => cleaned === token || cleaned.includes(token));
}

function prepareGatepassPayload(rawPayload) {
  const type = normalizeEnum(rawPayload?.type, GATEPASS_TYPES);
  const destination = sanitizeText(rawPayload?.destination);
  const reason = sanitizeText(rawPayload?.reason);
  const expected_exit = normalizeApiDate(rawPayload?.expected_exit || rawPayload?.expectedExit);
  const expected_return = normalizeApiDate(rawPayload?.expected_return || rawPayload?.expectedReturn);

  if (!type || !destination || !reason || !expected_exit || !expected_return) {
    return { error: 'I need a clear type, destination, reason, and exact exit/return date-time before I can submit this pass safely.' };
  }

  const exitDate = new Date(expected_exit);
  const returnDate = new Date(expected_return);

  if (returnDate <= exitDate) {
    return { error: 'Return time must be later than exit time before I can submit this pass.' };
  }

  return {
    payload: {
      type,
      destination,
      reason,
      expected_exit,
      expected_return,
      ...(sanitizeText(rawPayload?.guardian_name || rawPayload?.guardianName) && {
        guardian_name: sanitizeText(rawPayload?.guardian_name || rawPayload?.guardianName),
      }),
      ...(sanitizeText(rawPayload?.guardian_phone || rawPayload?.guardianPhone) && {
        guardian_phone: sanitizeText(rawPayload?.guardian_phone || rawPayload?.guardianPhone),
      }),
      ...(sanitizeText(rawPayload?.guardian_relation || rawPayload?.guardianRelation) && {
        guardian_relation: sanitizeText(rawPayload?.guardian_relation || rawPayload?.guardianRelation),
      }),
    },
  };
}

function prepareComplaintPayload(rawPayload) {
  const title = sanitizeText(rawPayload?.title);
  const description = sanitizeText(rawPayload?.description);
  const category = normalizeEnum(rawPayload?.category, COMPLAINT_CATEGORIES);
  const severity = normalizeEnum(rawPayload?.severity, COMPLAINT_SEVERITIES);

  if (!title || !description || !category || !severity) {
    return { error: 'I need a clear title, description, category, and severity before I can submit this complaint safely.' };
  }

  return {
    payload: {
      title,
      description,
      category,
      severity,
    },
  };
}

export default function ChatBot() {
  const { user } = useAuthStore();
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [session, setSession]   = useState(null);   // fetched context bundle
  const [pending, setPending]   = useState(null);   // multi-step state
  const [draftSubmission, setDraftSubmission] = useState(null);
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

  const runRuleBasedFallback = useCallback((messageText, fallbackNotice) => {
    const ctx = {
      user,
      message: messageText,
      session: session || {},
      pending,
      api,
      now: new Date(),
    };

    const response = routeMessage(messageText, ctx);

    if (response.nextPending !== undefined) setPending(response.nextPending);
    if (response.clearPending) setPending(null);

    const text = fallbackNotice && typeof response.text === 'string'
      ? `${fallbackNotice}\n\n${response.text}`
      : response.text;

    return {
      id: Date.now() + 1,
      from: 'bot',
      timestamp: new Date(),
      ...response,
      text,
    };
  }, [user, session, pending]);

  const submitStructuredRequest = useCallback(async (submission) => {
    if (!submission || typeof submission !== 'object') {
      return {
        type: 'error',
        text: 'I could not find a valid application draft to submit.',
      };
    }

    if (submission.kind === 'gatepass') {
      const { payload, error } = prepareGatepassPayload(submission.payload);
      if (error) {
        return { type: 'text', text: error };
      }

      try {
        const response = await api.post('/gatepass/apply', payload);
        setSession((prev) => prev ? {
          ...prev,
          gatepass: [response.gatepass, ...(prev.gatepass || [])].slice(0, 5),
        } : prev);

        return {
          type: 'text',
          text: response?.message || `Your ${payload.type.toLowerCase()} application to ${payload.destination} has been submitted successfully.`,
        };
      } catch (error) {
        return {
          type: 'error',
          text: error?.message || 'I could not submit that gatepass right now.',
        };
      }
    }

    if (submission.kind === 'complaint') {
      const { payload, error } = prepareComplaintPayload(submission.payload);
      if (error) {
        return { type: 'text', text: error };
      }

      try {
        const response = await api.post('/complaints', payload);
        setSession((prev) => prev ? {
          ...prev,
          complaints: [response.complaint, ...(prev.complaints || [])].slice(0, 5),
        } : prev);

        return {
          type: 'text',
          text: response?.message || `Your complaint "${payload.title}" has been submitted successfully.`,
        };
      } catch (error) {
        return {
          type: 'error',
          text: error?.message || 'I could not submit that complaint right now.',
        };
      }
    }

    return {
      type: 'error',
      text: 'That draft could not be matched to a supported submission flow.',
    };
  }, []);

  const handleDraftSubmissionAction = useCallback(async (messageText) => {
    if (!draftSubmission) return null;

    if (isCancellationMessage(messageText)) {
      setDraftSubmission(null);
      return {
        type: 'text',
        text: 'Okay, I cancelled that draft submission.',
      };
    }

    if (!isConfirmationMessage(messageText)) {
      return null;
    }

    const result = await submitStructuredRequest(draftSubmission);
    if (result.type !== 'error') {
      setDraftSubmission(null);
    }

    return result;
  }, [draftSubmission, submitStructuredRequest]);

  const handlePendingSubmissionAction = useCallback(async (messageText) => {
    if (!pending || pending.step !== 'confirm') return null;

    if (isCancellationMessage(messageText)) {
      setPending(null);
      return {
        type: 'text',
        text: pending.action === 'collect_complaint' ? 'Complaint submission cancelled.' : 'Application cancelled.',
      };
    }

    if (!isConfirmationMessage(messageText)) {
      return null;
    }

    let draft = null;

    if (pending.action === 'collect_leave') {
      draft = {
        kind: 'gatepass',
        payload: {
          type: pending.data?.type,
          destination: pending.data?.destination,
          reason: pending.data?.reason,
          expected_exit: pending.data?.from,
          expected_return: pending.data?.to,
        },
      };
    } else if (pending.action === 'collect_complaint') {
      draft = {
        kind: 'complaint',
        payload: {
          title: pending.data?.title,
          description: pending.data?.description,
          category: pending.data?.category,
          severity: pending.data?.severity,
        },
      };
    }

    if (!draft) return null;

    const result = await submitStructuredRequest(draft);
    if (result.type !== 'error') {
      setPending(null);
    }

    return result;
  }, [pending, submitStructuredRequest]);

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

    try {
      const localSubmissionResult = await handlePendingSubmissionAction(text);
      if (localSubmissionResult) {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          from: 'bot',
          timestamp: new Date(),
          ...localSubmissionResult,
        }]);
        return;
      }

      const aiDraftResult = await handleDraftSubmissionAction(text);
      if (aiDraftResult) {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          from: 'bot',
          timestamp: new Date(),
          ...aiDraftResult,
        }]);
        return;
      }

      if (pending) {
        const botMsg = runRuleBasedFallback(text);
        setMessages((prev) => [...prev, botMsg]);
        return;
      }

      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ from: m.from, text: m.text }));

      // Send to Groq-powered backend route
      const response = await api.post('/chatbot/chat', {
        message: text,
        history,
        context: session || {}
      });

      const botMsg = {
        id: Date.now() + 1,
        from: 'bot',
        ...response,
        timestamp: normalizeTimestamp(response?.timestamp),
      };
      setDraftSubmission(response?.submission || null);
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      if (err?.fallbackMode === 'rule-based') {
        const botMsg = runRuleBasedFallback(text, err.text);
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorText =
          typeof err?.text === 'string' ? err.text :
          typeof err?.message === 'string' ? err.message :
          'AI service unavailable. Please check your connection or try again later.';

        setPending(null);
        setMessages((prev) => [...prev, {
          id: Date.now() + 1, from: 'bot', type: 'error',
          text: errorText,
          timestamp: new Date(),
        }]);
      }
    } finally {
      setLoading(false);
    }
  }, [draftSubmission, handleDraftSubmissionAction, handlePendingSubmissionAction, input, loading, messages, pending, runRuleBasedFallback, session]);

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
              {normalizeTimestamp(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
