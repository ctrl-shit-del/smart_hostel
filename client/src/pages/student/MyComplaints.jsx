import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Star, Clock, Loader2, MessageSquare } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Open': '#f59e0b', 'Assigned': '#6366f1', 'In Progress': '#3b82f6',
  'Resolved': '#10b981', 'Closed': '#6b7280', 'Escalated': '#ef4444',
};

const STATUS_ORDER = ['Open', 'Assigned', 'In Progress', 'Resolved', 'Closed'];

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [ratingModal, setRatingModal] = useState(null);
  const [rating, setRating] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');

  useEffect(() => { fetchComplaints(); }, [filter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get('/complaints' + params);
      setComplaints(res.complaints || []);
    } catch (err) { toast.error('Failed to load complaints'); }
    finally { setLoading(false); }
  };

  const submitRating = async () => {
    if (!rating) { toast.error('Select a rating'); return; }
    try {
      await api.post(`/complaints/${ratingModal._id}/rate`, { rating, feedback_note: feedbackNote });
      toast.success('Thank you for your feedback!');
      setRatingModal(null);
      setRating(0);
      setFeedbackNote('');
      fetchComplaints();
    } catch (err) { toast.error(err.message || 'Failed to submit rating'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <ClipboardCheck size={24} /> My Complaints
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>Track your raised complaints</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'Open', 'Assigned', 'In Progress', 'Resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.8rem' }}>
            {f === 'all' ? 'All' : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10, color: 'var(--text-muted)' }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
        </div>
      ) : complaints.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <MessageSquare size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div>No complaints found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map(c => {
            const statusColor = STATUS_COLORS[c.status] || '#6b7280';
            const currentIdx = STATUS_ORDER.indexOf(c.status);

            return (
              <div key={c._id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{c.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{c.description?.substring(0, 120)}{c.description?.length > 120 ? '...' : ''}</div>
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                    background: `${statusColor}20`, color: statusColor, whiteSpace: 'nowrap',
                  }}>
                    {c.status}
                  </span>
                </div>

                {/* Status Timeline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12 }}>
                  {STATUS_ORDER.slice(0, 4).map((step, i) => {
                    const reached = currentIdx >= i;
                    const color = reached ? (STATUS_COLORS[step] || '#6b7280') : 'var(--border)';
                    return (
                      <React.Fragment key={step}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: reached ? `${color}30` : 'transparent', border: `2px solid ${color}`,
                          fontSize: '0.6rem', fontWeight: 800, color,
                        }}>
                          {reached ? '✓' : (i + 1)}
                        </div>
                        {i < 3 && <div style={{ flex: 1, height: 2, background: currentIdx > i ? color : 'var(--border)' }} />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>{c.category}</span>
                  <span>{c.severity}</span>
                  {c.ai_category && <span style={{ color: '#6366f1' }}>AI: {c.ai_category} ({Math.round((c.ai_confidence || 0) * 100)}%)</span>}
                  <span><Clock size={12} style={{ verticalAlign: -2 }} /> {c.raised_at ? format(new Date(c.raised_at), 'dd MMM yyyy') : 'N/A'}</span>
                  {c.is_systemic && <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠ Systemic</span>}
                </div>

                {/* Rating Button */}
                {c.status === 'Resolved' && !c.rating && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 10, gap: 6 }}
                    onClick={() => setRatingModal(c)}>
                    <Star size={14} /> Rate Resolution
                  </button>
                )}
                {c.rating && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={16} fill={s <= c.rating ? '#f59e0b' : 'none'} color={s <= c.rating ? '#f59e0b' : 'var(--border)'} />
                    ))}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 6 }}>{c.feedback_note}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <>
          <div onClick={() => setRatingModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: 28, width: 380, zIndex: 201,
          }}>
            <h3 style={{ fontWeight: 800, marginBottom: 16 }}>Rate Resolution</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{ratingModal.title}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={32} style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
                  fill={s <= rating ? '#f59e0b' : 'none'} color={s <= rating ? '#f59e0b' : 'var(--border)'}
                  onClick={() => setRating(s)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} />
              ))}
            </div>
            <textarea className="input" rows={2} placeholder="Optional feedback..." value={feedbackNote}
              onChange={e => setFeedbackNote(e.target.value)} style={{ marginBottom: 12, resize: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setRatingModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitRating}>Submit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
