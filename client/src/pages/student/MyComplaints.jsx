import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';

const STATUS_BADGES = {
  Open: 'badge-warning', Assigned: 'badge-info', 'In Progress': 'badge-info',
  Resolved: 'badge-success', Closed: 'badge-muted', Escalated: 'badge-danger',
};

export default function MyComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/complaints').then((res) => { setComplaints(res.complaints || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>My Complaints</h1><p>Track status of all your raised complaints</p></div>
      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.length === 0 && <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No complaints raised yet.</div>}
          {complaints.map((c) => (
            <div key={c._id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.category} · {format(new Date(c.raised_at || c.createdAt), 'dd MMM yyyy')}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span className={`badge ${c.severity === 'Urgent' ? 'badge-danger' : 'badge-muted'}`}>{c.severity}</span>
                  <span className={`badge ${STATUS_BADGES[c.status] || 'badge-muted'}`}>{c.status}</span>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{c.description?.substring(0, 100)}...</div>
              {c.sla_deadline && (
                <div style={{ fontSize: '0.75rem', color: new Date() > new Date(c.sla_deadline) ? '#ef4444' : 'var(--text-muted)' }}>
                  SLA: {format(new Date(c.sla_deadline), 'dd MMM h:mm a')} {new Date() > new Date(c.sla_deadline) && c.status !== 'Resolved' ? '⚠️ BREACHED' : ''}
                </div>
              )}
              {c.status === 'Resolved' && !c.rating && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: '#10b981' }}>
                  ✅ Resolved — Please rate the resolution quality
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
