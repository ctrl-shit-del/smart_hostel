import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_BADGE = { Open: 'badge-warning', Assigned: 'badge-info', 'In Progress': 'badge-info', Resolved: 'badge-success', Escalated: 'badge-danger', Closed: 'badge-muted' };

export default function ComplaintDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState({ status: '', category: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => { fetchAll(); }, [filter]);

  const fetchAll = async () => {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.category) params.set('category', filter.category);
    try {
      const [cRes, sRes] = await Promise.allSettled([
        api.get(`/complaints?${params}&limit=50`),
        api.get('/complaints/analytics/stats'),
      ]);
      setComplaints(cRes.value?.complaints || []);
      setStats(sRes.value || null);
    } catch {}
    setLoading(false);
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/complaints/${id}`, { status });
      toast.success(`Complaint marked as ${status}`);
      fetchAll();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Complaints Dashboard</h1><p>AI-routed, SLA-tracked complaint management</p></div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {stats.statusBreakdown?.map(({ _id, count }) => (
            <div key={_id} className="glass-card stat-card">
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{count}</div>
              <div className="stat-label">{_id}</div>
            </div>
          ))}
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ fontSize: '1.5rem', background: '#f59e0b', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {stats.avgResolutionHrs?.toFixed(1) || '—'}h
            </div>
            <div className="stat-label">Avg Resolution</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ fontSize: '1.5rem', background: '#ef4444', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{stats.slaBreaches}</div>
            <div className="stat-label">SLA Breaches</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="select" style={{ width: 180 }} value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Statuses</option>
          {['Open', 'Assigned', 'In Progress', 'Resolved', 'Escalated', 'Closed'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 180 }} value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          {['Electrical', 'Plumbing', 'Civil', 'Housekeeping', 'Pest Control', 'Internet', 'Other'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Student</th><th>Title</th><th>Category</th><th>Severity</th><th>Status</th><th>SLA</th><th>Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td></tr>}
              {!loading && complaints.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No complaints found</td></tr>}
              {complaints.map((c) => {
                const slaBreached = new Date() > new Date(c.sla_deadline) && c.status !== 'Resolved';
                return (
                  <tr key={c._id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.student_name || c.raised_by?.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Room {c.room_no} · Floor {c.floor_no}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.title}</div>
                      {c.is_systemic && <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600 }}>⚠️ SYSTEMIC</span>}
                    </td>
                    <td><span className="badge badge-brand">{c.category}</span></td>
                    <td><span className={`badge ${c.severity === 'Urgent' ? 'badge-danger' : 'badge-muted'}`}>{c.severity}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] || 'badge-muted'}`}>{c.status}</span></td>
                    <td style={{ fontSize: '0.75rem', color: slaBreached ? '#ef4444' : 'var(--text-muted)', fontWeight: slaBreached ? 700 : 400 }}>
                      {slaBreached ? '⚠️ BREACHED' : format(new Date(c.sla_deadline), 'dd MMM h:mm a')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status !== 'Resolved' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(c._id, 'Resolved')}>Resolve</button>}
                        {c.status === 'Open' && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(c._id, 'In Progress')}>Start</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
