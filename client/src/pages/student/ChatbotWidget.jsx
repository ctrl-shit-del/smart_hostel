import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  MessageCircle, X, Send, Bot, User, Sparkles, RotateCcw, Minimize2,
  ChevronRight, AlertTriangle, Heart
} from 'lucide-react';

function parseMarkdownLight(text) {
  // Minimal markdown: **bold**, *italic*, `code`, bullet points
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(99,102,241,0.15);padding:1px 6px;border-radius:4px;font-size:0.82em;color:#818cf8">$1</code>')
    .replace(/^• /gm, '&bull; ')
    .replace(/\n/g, '<br/>');
}

export default function ChatbotWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [quickActions, setQuickActions] = useState(['Help', 'Mess menu', 'My complaints', 'Room info']);
  const [escalated, setEscalated] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load existing session on open
  const loadSession = useCallback(async () => {
    try {
      const res = await api.get('/chatbot/session');
      if (res.session_id && res.messages?.length > 0) {
        setSessionId(res.session_id);
        setMessages(res.messages.map(m => ({
          role: m.role,
          content: m.content,
          intent: m.intent,
          time: new Date(m.created_at),
        })));
      } else {
        // Add welcome message
        setMessages([{
          role: 'bot',
          content: `Hey **${user?.name?.split(' ')[0]}**! 👋\n\nI'm your SmartHostel assistant. Ask me about mess menu, laundry, complaints, gatepass, room info, or hostel policies!\n\nWhat would you like to know?`,
          time: new Date(),
        }]);
      }
    } catch {
      setMessages([{
        role: 'bot',
        content: `Hello! 👋 I'm your SmartHostel assistant. How can I help you today?`,
        time: new Date(),
      }]);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadSession();
    }
  }, [isOpen, loadSession]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMessage = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chatbot/message', {
        message: msg,
        session_id: sessionId,
      });

      setSessionId(res.session_id);

      const botMessage = {
        role: 'bot',
        content: res.reply,
        intent: res.intent,
        time: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);

      if (res.quick_actions) setQuickActions(res.quick_actions);
      if (res.escalated) {
        setEscalated(true);
        if (res.escalation_message) {
          setMessages(prev => [...prev, {
            role: 'bot',
            content: res.escalation_message,
            time: new Date(),
            isEscalation: true,
          }]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again or use the sidebar navigation for direct access.',
        time: new Date(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const newSession = async () => {
    try {
      const res = await api.post('/chatbot/session/new');
      setSessionId(res.session_id);
      setMessages([{
        role: 'bot',
        content: `Fresh start! 🔄 How can I help you, **${user?.name?.split(' ')[0]}**?`,
        time: new Date(),
      }]);
      setEscalated(false);
      setQuickActions(['Help', 'Mess menu', 'My complaints', 'Room info']);
    } catch {
      toast.error('Failed to start new session');
    }
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="chatbot-toggle"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--grad-brand)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.5)',
            zIndex: 998,
            transition: 'all 300ms',
            animation: 'pulse-glow 3s infinite',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bot size={26} color="white" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 400,
            height: 560,
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 32px rgba(99, 102, 241, 0.15)',
            animation: 'fadeInUp 0.3s ease',
          }}
          id="chatbot-panel"
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px',
            background: 'var(--grad-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}>
                <Bot size={20} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white', lineHeight: 1.2 }}>SmartHostel AI</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Online — Ready to help
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={newSession}
                title="New conversation"
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 200ms',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <RotateCcw size={15} color="white" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                  width: 32, height: 32, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 200ms',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              >
                <X size={16} color="white" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: 'var(--bg-base)',
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'fadeInUp 0.25s ease',
                }}
              >
                <div style={{
                  maxWidth: '85%',
                  display: 'flex',
                  gap: 8,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: msg.role === 'user' ? 'var(--grad-brand)' : 'rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 2,
                  }}>
                    {msg.role === 'user'
                      ? <User size={14} color="white" />
                      : <Sparkles size={14} color="#818cf8" />}
                  </div>

                  {/* Bubble */}
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user'
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    background: msg.role === 'user'
                      ? 'var(--grad-brand)'
                      : msg.isEscalation
                        ? 'rgba(236, 72, 153, 0.12)'
                        : msg.isError
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'var(--bg-card)',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    border: msg.role === 'user'
                      ? 'none'
                      : msg.isEscalation
                        ? '1px solid rgba(236, 72, 153, 0.25)'
                        : msg.isError
                          ? '1px solid rgba(239, 68, 68, 0.25)'
                          : '1px solid var(--border)',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                    {msg.isEscalation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: '#ec4899' }}>
                        <Heart size={14} />
                        <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Wellness Check</span>
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: parseMarkdownLight(msg.content) }} />
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', animation: 'fadeInUp 0.2s ease' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Sparkles size={14} color="#818cf8" />
                </div>
                <div style={{
                  padding: '12px 18px', borderRadius: '16px 16px 16px 4px',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <span className="typing-dot" style={{ '--i': 0 }} />
                  <span className="typing-dot" style={{ '--i': 1 }} />
                  <span className="typing-dot" style={{ '--i': 2 }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions chips */}
          {quickActions.length > 0 && (
            <div style={{
              padding: '8px 16px',
              display: 'flex', gap: 6, flexWrap: 'wrap',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              flexShrink: 0,
            }}>
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action)}
                  disabled={loading}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: '#818cf8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; }}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex', gap: 8, alignItems: 'center',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              className="input"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
              style={{
                flex: 1,
                borderRadius: 'var(--radius-full)',
                padding: '10px 18px',
                fontSize: '0.85rem',
              }}
              id="chatbot-input"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: input.trim() ? 'var(--grad-brand)' : 'var(--bg-elevated)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 200ms',
                boxShadow: input.trim() ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
              }}
              id="chatbot-send"
            >
              <Send size={16} color={input.trim() ? 'white' : 'var(--text-muted)'} />
            </button>
          </div>
        </div>
      )}

      {/* Inline styles for typing animation */}
      <style>{`
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: typingBounce 1.4s infinite;
          animation-delay: calc(var(--i) * 0.2s);
        }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
