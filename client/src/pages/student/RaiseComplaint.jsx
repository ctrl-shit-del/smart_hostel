import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { Zap, Loader2 } from 'lucide-react';

const CATEGORIES = ['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Other'];

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '', severity: 'Normal', photos: [] });
  const [aiResult, setAiResult] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const classifyWithAI = async () => {
    if (!form.description) { toast.error('Enter description first'); return; }
    setClassifying(true);
    try {
      const res = await api.post('/complaints/classify', { description: form.description });
      setAiResult(res);
      setForm((f) => ({ ...f, category: res.category }));
      toast.success(`AI classified: ${res.category} (${Math.round(res.confidence * 100)}% confidence)`);
    } catch {
      toast.error('AI classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category) { toast.error('Fill all required fields'); return; }
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
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header"><h1>Raise a Complaint</h1><p>AI will auto-route your complaint to the right department</p></div>
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="input" placeholder="Short description of the issue" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>

        <div className="form-group">
          <label className="form-label">Description *</label>
          <textarea className="textarea" placeholder="Describe the problem in detail..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 6 }} onClick={classifyWithAI} disabled={classifying}>
            {classifying ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {classifying ? 'Classifying...' : '⚡ Auto-classify with AI'}
          </button>
          {aiResult && (
            <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.8rem', marginTop: 8 }}>
              <div style={{ fontWeight: 700, color: '#818cf8' }}>AI Classification Result</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                Category: <strong>{aiResult.category}</strong> · Confidence: <strong>{Math.round(aiResult.confidence * 100)}%</strong> · Urgency: <strong>{Math.round(aiResult.urgency_score * 100)}%</strong>
              </div>
              {aiResult.matched_keywords?.length > 0 && (
                <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Keywords: {aiResult.matched_keywords.join(', ')}</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              <option value="Normal">Normal (24hr SLA)</option>
              <option value="Urgent">Urgent (2hr SLA)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? 'Submitting...' : 'Submit Complaint →'}
          </button>
        </div>
      </form>
    </div>
  );
}
