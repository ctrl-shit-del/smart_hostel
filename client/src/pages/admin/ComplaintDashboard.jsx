import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Filter, Clock, Loader2, CheckCircle2, AlertTriangle, ChartBar } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const STATUS_COLORS = {
  'Open': '#f59e0b', 'Assigned': '#8b5cf6', 'In Progress': '#3b82f6',
  'Resolved': '#10b981', 'Closed': '#6b7280', 'Escalated': '#ef4444',
};

import { formatDistanceToNow } from 'date-fns';

export default function ComplaintDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.append('status', filterStatus);
      if (filterCategory) queryParams.append('category', filterCategory);

      const [compRes, statsRes] = await Promise.all([
        api.get(`/complaints?${queryParams.toString()}`),
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
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Clock size={14} /> Avg Resolution
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{Math.round(stats.avgResolutionHrs)} <span style={{fontSize: '1rem', color: 'var(--text-muted)'}}>hrs</span></div>
          </div>
          <div className="card" style={{ padding: 16, borderLeft: stats.slaBreaches > 0 ? '4px solid #ef4444' : '4px solid #10b981', display: 'flex', flexDirection: 'column', gap: 4, background: stats.slaBreaches > 0 ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: stats.slaBreaches > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
              {stats.slaBreaches > 0 ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} SLA Breaches
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: stats.slaBreaches > 0 ? '#ef4444' : '#10b981' }}>{stats.slaBreaches}</div>
          </div>
          <div className="card" style={{ padding: 16, background: 'var(--grad-brand)', display: 'flex', flexDirection: 'column', gap: 4, gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
              <ChartBar size={14} /> Total Open Pipeline
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>
              {stats.statusBreakdown?.reduce((acc, curr) => (curr._id !== 'Resolved' && curr._id !== 'Closed' ? acc + curr.count : acc), 0) || 0}
              <span style={{fontSize: '1rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, marginLeft: 8}}>active issues</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', alignItems: 'center' }}>
        <button className={`btn btn-sm ${filterStatus === '' && filterCategory === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus(''); setFilterCategory(''); }}>All</button>
        {Object.keys(STATUS_COLORS).map(s => (
          <button key={s} className={`btn btn-sm ${filterStatus === s && filterCategory === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilterStatus(s); setFilterCategory(''); }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s] }} /> {s}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button className={`btn btn-sm ${filterCategory === 'Ragging / Harassment' ? 'btn-primary' : 'btn-secondary'}`} 
            style={filterCategory === 'Ragging / Harassment' ? { background: '#ef4444', borderColor: '#ef4444', color: 'white' } : { color: '#ef4444', borderColor: '#ef444440', background: '#ef444410' }}
            onClick={() => { setFilterCategory('Ragging / Harassment'); setFilterStatus(''); }}>
          <AlertTriangle size={14} style={{ marginRight: 4 }} /> Ragging / Harassment
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {complaints.length === 0 ? (
            <div className="card" style={{ padding: 60, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={32} color="#10b981" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>All Clear!</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No complaints found for the selected view. Great job!</p>
            </div>
          ) : (
            complaints.map(c => {
              const statusColor = STATUS_COLORS[c.status];
              // Calculate SLA
              const now = new Date();
              const deadline = new Date(c.sla_deadline);
              const hrsLeft = (deadline - now) / 3600000;
              const isBreached = c.sla_breached || (hrsLeft < 0 && c.status !== 'Resolved' && c.status !== 'Closed');
              const maxSla = c.severity === 'Urgent' ? 2 : 24;
              const timeProgress = Math.max(0, Math.min(100, ((maxSla - hrsLeft) / maxSla) * 100));

              return (
                <div key={c._id} className="card" style={{ 
                  padding: 20, 
                  borderLeft: `4px solid ${isBreached && c.status !== 'Resolved' ? '#ef4444' : statusColor}`,
                  boxShadow: c.category === 'Ragging / Harassment' ? '0 4px 24px rgba(239,68,68,0.15)' : 'var(--shadow-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: c.category === 'Ragging / Harassment' ? '#ef4444' : 'inherit' }}>
                          {c.category === 'Ragging / Harassment' && <AlertTriangle size={18} color="#ef4444" style={{ display: 'inline', verticalAlign: -4, marginRight: 6 }} />}
                          {c.title}
                        </span>
                        <span className="badge" style={{ background: `${statusColor}15`, color: statusColor, fontWeight: 700 }}>{c.status}</span>
                        {c.is_systemic && <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Systemic Issue</span>}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {formatDistanceToNow(new Date(c.raised_at), { addSuffix: true })}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                        {c.description}
                      </div>

                      <div style={{ display: 'flex', gap: 20, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ color: c.is_anonymous ? '#10b981' : 'inherit', fontWeight: c.is_anonymous ? 600 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <UserIcon size={14} /> 
                          {c.student_name} ({c.register_number}) 
                          {c.is_anonymous && c.student_name !== 'Anonymous Student' && <span style={{color: '#10b981', fontSize: '0.7rem'}}>(Anonymous Request)</span>}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          Room {c.floor_no}{String(c.room_no).padStart(2, '0')}
                        </span>
                        <span style={{ color: c.category === 'Ragging / Harassment' ? '#ef4444' : 'inherit', fontWeight: c.category === 'Ragging / Harassment' ? 800 : 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          {c.category} • {c.severity}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12, minWidth: 180 }}>
                      
                      {c.status !== 'Resolved' && c.status !== 'Closed' ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isBreached ? '#ef4444' : timeProgress > 80 ? '#f59e0b' : 'var(--text-secondary)' }}>
                            {isBreached ? 'SLA BREACHED!' : `${Math.floor(hrsLeft)}h ${Math.floor((hrsLeft%1)*60)}m left`}
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${timeProgress}%`, 
                              background: isBreached || timeProgress > 90 ? '#ef4444' : timeProgress > 70 ? '#f59e0b' : '#3b82f6',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle2 size={14} /> Solved in {c.resolution_time_hrs ? Math.round(c.resolution_time_hrs) : 0}h
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {c.category === 'Ragging / Harassment' && c.status !== 'Resolved' && c.status !== 'Closed' && c.status !== 'Escalated' && (
                          <button disabled={updatingId === c._id} onClick={() => updateStatus(c._id, 'Escalated')} className="btn btn-sm" style={{ fontSize: '0.75rem', background: '#ef4444', color: 'white', border: 'none', boxShadow: '0 2px 10px rgba(239,68,68,0.3)' }}>
                            <AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: -2 }} /> Escalate Immediately
                          </button>
                        )}
                        {c.status === 'Open' && (
                          <button disabled={updatingId === c._id} onClick={() => updateStatus(c._id, 'In Progress')} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }}>Start Work</button>
                        )}
                        {(c.status === 'Open' || c.status === 'In Progress') && (
                          <button disabled={updatingId === c._id} onClick={() => updateStatus(c._id, 'Resolved')} className="btn btn-sm" style={{ fontSize: '0.75rem', background: '#10b98120', color: '#10b981', border: '1px solid #10b98140' }}>Resolve</button>
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
