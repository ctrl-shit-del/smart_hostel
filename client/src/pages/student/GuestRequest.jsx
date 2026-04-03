import React, { useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function GuestRequest() {
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', relationship: '', purpose: '', visit_date: '', id_type: 'Aadhar' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/guests/request', { ...form, visit_date: new Date(form.visit_date) });
      toast.success('Guest request submitted! Awaiting warden approval.');
      setForm({ guest_name: '', guest_phone: '', relationship: '', purpose: '', visit_date: '', id_type: 'Aadhar' });
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 540, margin: '0 auto' }}>
      <div className="page-header"><h1>Guest Request</h1><p>Request warden approval for a visitor</p></div>
      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="form-group">
          <label className="form-label">Guest Name *</label>
          <input className="input" placeholder="Full name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Guest Phone</label>
            <input className="input" placeholder="Mobile number" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Relationship *</label>
            <select className="select" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} required>
              <option value="">Select</option>
              {['Parent', 'Sibling', 'Relative', 'Friend', 'Other'].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Visit Date *</label>
          <input className="input" type="date" value={form.visit_date} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="form-label">Purpose of Visit</label>
          <input className="input" placeholder="Reason for visit..." value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">ID Proof Type</label>
          <select className="select" value={form.id_type} onChange={(e) => setForm({ ...form, id_type: e.target.value })}>
            {['Aadhar', 'PAN', 'Passport', 'Driving License', 'Voter ID'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Guest Request →'}</button>
      </form>
    </div>
  );
}
