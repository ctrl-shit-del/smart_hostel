import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format, addHours } from 'date-fns';

export default function ApplyGatepass() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'Outing', destination: '', reason: '', expected_exit: '', expected_return: '', guardian_name: '', guardian_phone: '', guardian_relation: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.destination || !form.expected_exit || !form.expected_return) { toast.error('Fill all required fields'); return; }
    setSubmitting(true);
    try {
      await api.post('/gatepass/apply', { ...form, expected_exit: new Date(form.expected_exit), expected_return: new Date(form.expected_return) });
      toast.success('Gatepass application submitted! Awaiting warden approval.');
      navigate('/student/gatepass');
    } catch (err) {
      toast.error(err.message || 'Failed to apply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 580, margin: '0 auto' }}>
      <div className="page-header"><h1>Apply for Gatepass</h1><p>Outing (max 6hrs, return by 6PM) or Leave (overnight)</p></div>
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="form-group">
          <label className="form-label">Pass Type</label>
          <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="Outing">🚶 Outing (max 6hrs, return by 6PM)</option>
            <option value="Leave">🏠 Leave (overnight with guardian)</option>
            <option value="Hospital">🏥 Hospital Visit</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Destination *</label>
          <input className="input" placeholder="e.g. Chennai Central, VIT Gate 2..." value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <input className="input" placeholder="Purpose of visit..." value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Exit Time *</label>
            <input className="input" type="datetime-local" value={form.expected_exit} onChange={(e) => setForm({ ...form, expected_exit: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Return Time *</label>
            <input className="input" type="datetime-local" value={form.expected_return} onChange={(e) => setForm({ ...form, expected_return: e.target.value })} required />
          </div>
        </div>
        {form.type === 'Leave' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#818cf8' }}>Guardian Details (required for Leave)</div>
            <input className="input" placeholder="Guardian Name" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
            <input className="input" placeholder="Guardian Phone" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
            <input className="input" placeholder="Relation (Parent/Sibling)" value={form.guardian_relation} onChange={(e) => setForm({ ...form, guardian_relation: e.target.value })} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>{submitting ? 'Submitting...' : 'Submit Application →'}</button>
        </div>
      </form>
    </div>
  );
}
