import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const emptyForm = {
  title: '',
  content: '',
  announcement_type: 'Notice',
  priority: 'Medium',
  target_blocks: [],
  poll: { question: '', options: ['', ''] },
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const res = await api.get('/announcements');
      setAnnouncements(res.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        poll: form.announcement_type === 'Poll'
          ? {
              question: form.poll.question,
              options: form.poll.options
                .map((label) => ({ label: label.trim() }))
                .filter((option) => option.label),
            }
          : undefined,
      };
      await api.post('/announcements', payload);
      toast.success(form.announcement_type === 'Poll' ? 'Poll published!' : 'Announcement published!');
      setForm(emptyForm);
      fetchAll();
    } catch (error) {
      toast.error(error?.message || 'Failed to publish');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Removed');
      fetchAll();
    } catch {
      toast.error('Failed');
    }
  };

  const updatePollOption = (index, value) => {
    setForm((prev) => {
      const nextOptions = [...prev.poll.options];
      nextOptions[index] = value;
      return { ...prev, poll: { ...prev.poll, options: nextOptions } };
    });
  };

  const addPollOption = () => {
    setForm((prev) => ({ ...prev, poll: { ...prev.poll, options: [...prev.poll.options, ''] } }));
  };

  const PRIORITY_BADGE = { Low: 'badge-muted', Medium: 'badge-info', High: 'badge-warning', Critical: 'badge-danger' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Announcements</h1>
        <p>Create regular notices or warden polls for movies, mess menu suggestions, hostel trips, sports events, and more.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 20 }}>
        <form onSubmit={handleCreate} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'start' }}>
          <h3 style={{ fontSize: '0.95rem' }}>New Announcement / Poll</h3>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="select" value={form.announcement_type} onChange={(e) => setForm({ ...form, announcement_type: e.target.value })}>
              <option>Notice</option>
              <option>Poll</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="input" placeholder="Announcement or poll title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
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

          {form.announcement_type === 'Poll' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 14, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="form-group">
                <label className="form-label">Poll Question *</label>
                <input
                  className="input"
                  placeholder="Example: Which movie should we screen this Friday?"
                  value={form.poll.question}
                  onChange={(e) => setForm({ ...form, poll: { ...form.poll, question: e.target.value } })}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {form.poll.options.map((option, index) => (
                  <div key={index} className="form-group">
                    <label className="form-label">Option {index + 1}</label>
                    <input
                      className="input"
                      placeholder={`Preferred option ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      required={index < 2}
                    />
                  </div>
                ))}
              </div>
              {form.poll.options.length < 8 && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={addPollOption}>
                  Add Another Option
                </button>
              )}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Publishing...' : form.announcement_type === 'Poll' ? 'Publish Poll' : 'Publish Announcement'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '0 4px' }}>Published Announcements</h3>
          {loading && <div className="skeleton" style={{ height: 100 }} />}
          {!loading && announcements.length === 0 && <div style={{ color: 'var(--text-muted)', padding: 16 }}>No announcements yet</div>}
          {announcements.map((a) => (
            <div key={a._id} className="glass-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {a.title}
                    <span className={`badge ${PRIORITY_BADGE[a.priority]}`}>{a.priority}</span>
                    <span className={`badge ${a.announcement_type === 'Poll' ? 'badge-brand' : 'badge-info'}`}>{a.announcement_type}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{a.content}</div>

                  {a.announcement_type === 'Poll' && a.poll && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(15,23,42,0.32)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontWeight: 600 }}>{a.poll.question}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                        {(a.poll.options || []).map((option) => {
                          const totalVotes = a.poll.totalVotes || 0;
                          const share = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                          return (
                            <div key={option.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
                                <span>{option.label}</span>
                                <span>{option.votes} votes · {share}%</span>
                              </div>
                              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                <div style={{ width: `${share}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(a._id)} style={{ flexShrink: 0 }}>X</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
