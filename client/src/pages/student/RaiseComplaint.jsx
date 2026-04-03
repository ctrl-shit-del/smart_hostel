import React, { useState, useRef } from 'react';
import { MessageSquare, Send, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Other'];
const SEVERITY_OPTIONS = [
  { value: 'Normal', label: 'Normal', color: '#f59e0b' },
  { value: 'Urgent', label: 'Urgent', color: '#ef4444' },
];

const CATEGORY_ICONS = {
  'Electrical': '⚡', 'Plumbing': '🔧', 'Civil': '🏗️', 'Housekeeping': '🧹',
  'Pest Control': '🐛', 'Internet': '📶', 'Other': '📋',
};

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '', severity: 'Normal' });
  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef(null);

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    setForm({ ...form, description: val });

    // Debounced AI classification
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length > 15) {
      debounceRef.current = setTimeout(async () => {
        setAiLoading(true);
        try {
          const res = await api.post('/complaints/classify', { description: val });
          setAiResult(res);
          // Auto-set category if confidence > 0.6
          if (res.category && res.confidence > 0.6 && !form.category) {
            setForm(prev => ({ ...prev, category: res.category }));
          }
        } catch { /* silent */ }
        finally { setAiLoading(false); }
      }, 800);
    } else {
      setAiResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/complaints', form);
      toast.success('Complaint raised successfully!');
      navigate('/student/complaints');
    } catch (err) {
      toast.error(err.message || 'Failed to raise complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16, gap: 6 }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Raise a Complaint</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI will auto-classify your issue</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" placeholder="e.g. Fan not working in room" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea className="input" rows={4} placeholder="Describe the issue in detail. Our AI will auto-classify it..."
              value={form.description} onChange={handleDescriptionChange}
              style={{ resize: 'vertical', minHeight: 100 }} />
          </div>

          {/* AI Classification Result */}
          {(aiLoading || aiResult) && (
            <div style={{
              padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: aiResult ? 10 : 0 }}>
                <Zap size={16} color="#6366f1" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1' }}>
                  {aiLoading ? 'Analyzing...' : 'AI Classification'}
                </span>
                {aiLoading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />}
              </div>
              {aiResult && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', fontSize: '0.85rem', fontWeight: 700, color: '#6366f1' }}>
                    {CATEGORY_ICONS[aiResult.category] || '📋'} {aiResult.category}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Confidence: <strong style={{ color: aiResult.confidence > 0.8 ? '#10b981' : '#f59e0b' }}>{Math.round(aiResult.confidence * 100)}%</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Urgency: <strong style={{ color: aiResult.urgency_score > 0.7 ? '#ef4444' : aiResult.urgency_score > 0.4 ? '#f59e0b' : '#10b981' }}>
                      {aiResult.urgency_score > 0.7 ? 'High' : aiResult.urgency_score > 0.4 ? 'Medium' : 'Low'}
                    </strong>
                  </div>
                  {aiResult.source === 'fallback' && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(rule-based)</span>}
                </div>
              )}
            </div>
          )}

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category * {aiResult && form.category === aiResult.category && <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>(AI suggested)</span>}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setForm({ ...form, category: cat })}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: `1px solid ${form.category === cat ? '#6366f1' : 'var(--border)'}`,
                    background: form.category === cat ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                    color: form.category === cat ? '#6366f1' : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="form-group">
            <label className="form-label">Severity</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {SEVERITY_OPTIONS.map(s => (
                <button key={s.value} type="button" onClick={() => setForm({ ...form, severity: s.value })}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${form.severity === s.value ? s.color : 'var(--border)'}`,
                    background: form.severity === s.value ? `${s.color}15` : 'var(--bg-elevated)',
                    color: form.severity === s.value ? s.color : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center',
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
            {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={18} /> Submit Complaint</>}
          </button>
        </form>
      </div>
    </div>
  );
}
