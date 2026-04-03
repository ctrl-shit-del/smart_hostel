import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Filter, Clock, Loader2, CheckCircle2, AlertTriangle, ChartBar } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Open': '#f59e0b', 'Assigned': '#6366f1', 'In Progress': '#3b82f6',
  'Resolved': '#10b981', 'Closed': '#6b7280', 'Escalated': '#ef4444',
};

export default function ComplaintDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, statsRes] = await Promise.all([
        api.get('/complaints' + (filterStatus ? `?status=${filterStatus}` : '')),
        api.get('/complaints/analytics/stats')
      ]);
      setComplaints(compRes.complaints || []);
      setStats(statsRes);
    } catch (err) {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await api.put(`/complaints/${id}`, { status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={24} /> Complaints Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Track, assign, and resolve student issues</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Avg Resolution</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round(stats.avgResolutionHrs)} hrs</div>
          </div>
          <div className="card" style={{ padding: 16, borderLeft: '3px solid #ef4444' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SLA Breaches</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>{stats.slaBreaches}</div>
          </div>
          <div className="card" style={{ padding: 16, background: 'var(--grad-brand)' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>Total Complaints</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
              {stats.statusBreakdown?.reduce((acc, curr) => acc + curr.count, 0) || 0}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        <button className={`btn btn-sm ${filterStatus === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterStatus('')}>All</button>
        {Object.keys(STATUS_COLORS).map(s => (
          <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterStatus(s)}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] }} /> {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No complaints found</div>
          ) : (
            complaints.map(c => {
              const statusColor = STATUS_COLORS[c.status];
              // Calculate SLA
              const now = new Date();
              const deadline = new Date(c.sla_deadline);
              const hrsLeft = (deadline - now) / 3600000;
              const isBreached = c.sla_breached || (hrsLeft < 0 && c.status !== 'Resolved' && c.status !== 'Closed');

              return (
                <div key={c._id} className="card" style={{ padding: 16, borderLeft: `4px solid ${statusColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem' }}>{c.title}</span>
                        {c.is_systemic && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Systemic</span>}
                      </div>
                      
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        {c.description}
                      </div>

                      <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <span><UserIcon size={12} style={{ verticalAlign: -2, marginRight: 4 }}/> {c.student_name} ({c.register_number})</span>
                        <span>Room {c.floor_no}{String(c.room_no).padStart(2, '0')}</span>
                        <span>{c.category} • {c.severity}</span>
                        {c.ai_category && <span style={{ color: '#6366f1' }}>AI: {c.ai_category}</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      <span className="badge" style={{ background: `${statusColor}20`, color: statusColor }}>{c.status}</span>
                      
                      {c.status !== 'Resolved' && c.status !== 'Closed' && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isBreached ? '#ef4444' : hrsLeft < 4 ? '#f59e0b' : '#10b981' }}>
                          SLA: {isBreached ? 'Breached' : `${Math.floor(hrsLeft)}h left`}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {c.status === 'Open' && (
                          <button disabled={updatingId === c._id} onClick={() => updateStatus(c._id, 'In Progress')} className="btn btn-primary btn-sm" style={{ fontSize: '0.7rem' }}>Mark In Progress</button>
                        )}
                        {(c.status === 'Open' || c.status === 'In Progress') && (
                          <button disabled={updatingId === c._id} onClick={() => updateStatus(c._id, 'Resolved')} className="btn btn-sm" style={{ fontSize: '0.7rem', background: '#10b98120', color: '#10b981' }}>Resolve</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const UserIcon = ({ size, style }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
