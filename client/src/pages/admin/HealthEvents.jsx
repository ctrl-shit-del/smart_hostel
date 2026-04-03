import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function HealthEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');

  useEffect(() => { fetchEvents(); }, [filter]);

  const fetchEvents = async () => {
    try {
      const res = await api.get(`/health/events?resolved=${filter === 'resolved'}`);
      setEvents(res.events || []);
    } catch {}
    setLoading(false);
  };

  const resolve = async (id) => {
    const note = prompt('Resolution note:') || 'Resolved';
    try {
      await api.put(`/health/events/${id}/resolve`, { resolution_note: note });
      toast.success('Emergency resolved');
      fetchEvents();
    } catch { toast.error('Failed to resolve'); }
  };

  const SEV_COLOR = { Minor: '#10b981', Moderate: '#f59e0b', Critical: '#ef4444' };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Health Emergency Events</h1><p>SOS alerts and emergency response tracking</p></div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['open', 'resolved'].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={`btn ${filter === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{t === 'open' ? 'Open Emergencies' : 'Resolved'}</button>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.length === 0 && <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No {filter} emergencies 🎉</div>}
          {events.map((e) => (
            <div key={e._id} className="glass-card" style={{ padding: 20, borderLeft: `3px solid ${SEV_COLOR[e.severity] || '#666'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {e.student_name}
                    <span className={`badge ${e.severity === 'Critical' ? 'badge-danger' : e.severity === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>{e.severity}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {e.register_number} · {e.block_name} Floor {e.floor_no} Room {e.room_no}
                  </div>
                  {e.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 8 }}>{e.description}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                    Reported: {format(new Date(e.reported_at), 'dd MMM yyyy h:mm a')}
                    {e.response_time_seconds && ` · Response: ${Math.round(e.response_time_seconds)}s`}
                  </div>
                </div>
                {!e.resolved && (
                  <button className="btn btn-success btn-sm" onClick={() => resolve(e._id)}>Mark Resolved</button>
                )}
              </div>
              {e.alerts_sent_to?.length > 0 && (
                <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Alerts sent to: {e.alerts_sent_to.map((a) => a.name).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
