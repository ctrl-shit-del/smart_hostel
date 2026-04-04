import React, { useState, useRef } from 'react';
import { MessageSquare, Send, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Ragging / Harassment', 'Other'];
const SEVERITY_OPTIONS = [
  { value: 'Normal', label: 'Normal', color: '#f59e0b' },
  { value: 'Urgent', label: 'Urgent', color: '#ef4444' },
];

const CATEGORY_ICONS = {
  'Electrical': '⚡', 'Plumbing': '🔧', 'Civil': '🏗️', 'Housekeeping': '🧹',
  'Pest Control': '🐛', 'Internet': '📶', 'Ragging / Harassment': '⚠️', 'Other': '📋',
};

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '', severity: 'Normal', is_anonymous: false });
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
          if (res.category && res.confidence > 0.6 && !form.category) {
            setForm(prev => ({ 
              ...prev, 
              category: res.category,
              severity: res.category === 'Ragging / Harassment' ? 'Urgent' : prev.severity
            }));
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
                <button key={cat} type="button" 
                  onClick={() => setForm({ ...form, category: cat, severity: cat === 'Ragging / Harassment' ? 'Urgent' : form.severity, is_anonymous: cat === 'Ragging / Harassment' ? true : form.is_anonymous })}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: `1px solid ${form.category === cat ? (cat === 'Ragging / Harassment' ? '#ef4444' : '#6366f1') : 'var(--border)'}`,
                    background: form.category === cat ? (cat === 'Ragging / Harassment' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.15)') : 'var(--bg-elevated)',
                    color: form.category === cat ? (cat === 'Ragging / Harassment' ? '#ef4444' : '#6366f1') : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous Toggle (Specifically highlighted for Ragging) */}
          <div className="form-group" style={{ background: form.is_anonymous ? 'rgba(16,185,129,0.05)' : 'transparent', padding: form.is_anonymous ? 12 : 0, borderRadius: 8, transition: 'all 0.2s', border: form.is_anonymous ? '1px solid rgba(16,185,129,0.2)' : 'none' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} style={{ width: 16, height: 16, accentColor: '#10b981' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: form.is_anonymous ? '#10b981' : 'var(--text)' }}>
                  Report Anonymously
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Only authorized personnel (Chief Warden/Security) will be able to see your identity.
                </span>
              </div>
            </label>
          </div>


          {/* Severity */}
          <div className="form-group">
            <label className="form-label">Severity</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {SEVERITY_OPTIONS.map(s => (
                <button key={s.value} type="button" 
                  disabled={form.category === 'Ragging / Harassment'}
                  onClick={() => setForm({ ...form, severity: s.value })}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, border: `1px solid ${form.severity === s.value ? s.color : 'var(--border)'}`,
                    background: form.severity === s.value ? `${s.color}15` : 'var(--bg-elevated)',
                    color: form.severity === s.value ? s.color : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '0.85rem', cursor: form.category === 'Ragging / Harassment' ? 'not-allowed' : 'pointer', textAlign: 'center', opacity: form.category === 'Ragging / Harassment' && s.value !== 'Urgent' ? 0.3 : 1
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
            {form.category === 'Ragging / Harassment' && <span style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 4 }}>Locked to Urgent for Harassment issues.</span>}
          </div>

          <button className="btn btn-primary btn-lg" type="submit" disabled={submitting} style={{ marginTop: 8 }}>
            {submitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</> : <><Send size={18} /> Submit Complaint</>}
          </button>
        </form>
      </div>
    </div>
  );
}
