import React, { useState } from 'react';
import { DoorOpen, Send, Loader2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TYPES = ['Outing', 'Leave', 'Hospital'];

export default function ApplyGatepass() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: 'Outing',
    destination: '',
    reason: '',
    expected_exit: '',
    expected_return: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_relation: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type || !form.destination || !form.expected_exit || !form.expected_return) {
      toast.error('Please fill required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/gatepass/apply', form);
      toast.success('Gatepass applied successfully');
      navigate('/student/gatepass');
    } catch (err) {
      toast.error(err.message || 'Application failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</button>
      
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DoorOpen size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Apply Gatepass</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Request permission to leave campus</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Gatepass Type *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {TYPES.map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setForm({ ...form, type: t })}
                  style={{
                    flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
                    border: `1px solid ${form.type === t ? '#6366f1' : 'var(--border)'}`,
                    background: form.type === t ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
                    color: form.type === t ? '#6366f1' : 'var(--text-primary)',
                  }}
                >{t}</button>
              ))}
            </div>
            {form.type === 'Outing' && <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: 4 }}>Note: Outings must not exceed 6 hours and must return by 6:00 PM.</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Destination *</label>
            <input className="input" placeholder="Where are you going?" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required />
          </div>

          <div className="form-group">
            <label className="form-label">Reason</label>
            <textarea className="input" rows={2} placeholder="Brief reason" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Exit Time *</label>
              <input type="datetime-local" className="input" value={form.expected_exit} onChange={e => setForm({...form, expected_exit: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Expected Return *</label>
              <input type="datetime-local" className="input" value={form.expected_return} onChange={e => setForm({...form, expected_return: e.target.value})} required />
            </div>
          </div>

          {form.type === 'Leave' && (
            <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Guardian Details (Required for Leave)</h4>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <input className="input" placeholder="Guardian Name" value={form.guardian_name} onChange={e => setForm({...form, guardian_name: e.target.value})} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input className="input" placeholder="Phone" value={form.guardian_phone} onChange={e => setForm({...form, guardian_phone: e.target.value})} required />
                <input className="input" placeholder="Relation (e.g. Father)" value={form.guardian_relation} onChange={e => setForm({...form, guardian_relation: e.target.value})} required />
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <Loader2 size={18} className="spin" /> : <><Send size={18} /> Apply</>}
          </button>
        </form>
      </div>
    </div>
  );
}
