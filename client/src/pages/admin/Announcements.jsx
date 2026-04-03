import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', priority: 'Medium', target_blocks: [] });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try { const res = await api.get('/announcements'); setAnnouncements(res.announcements || []); } catch {}
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/announcements', form);
      toast.success('Announcement published! Students notified instantly.');
      setForm({ title: '', content: '', priority: 'Medium', target_blocks: [] });
      fetchAll();
    } catch { toast.error('Failed to publish'); }
    finally { setSubmitting(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/announcements/${id}`); toast.success('Removed'); fetchAll(); } catch { toast.error('Failed'); }
  };

  const PRIORITY_BADGE = { Low: 'badge-muted', Medium: 'badge-info', High: 'badge-warning', Critical: 'badge-danger' };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Announcements</h1><p>Push notices to all students instantly via the portal + Socket.io alerts</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        <form onSubmit={handleCreate} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}>
          <h3 style={{ fontSize: '0.95rem' }}>New Announcement</h3>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Content *</label>
            <textarea className="textarea" placeholder="Full announcement text..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['Low', 'Medium', 'High', 'Critical'].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Publishing...' : '📢 Publish Announcement'}</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 4px' }}>Published Announcements</h3>
          {loading && <div className="skeleton" style={{ height: 100 }} />}
          {!loading && announcements.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16 }}>No announcements yet</div>}
          {announcements.map((a) => (
            <div key={a._id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a.title} <span className={`badge ${PRIORITY_BADGE[a.priority]}`}>{a.priority}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content?.substring(0, 100)}</div>
                </div>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(a._id)} style={{ flexShrink: 0 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
