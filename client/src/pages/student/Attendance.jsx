import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Calendar, Activity, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function MyAttendance() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance').then(res => {
      setHistory(res.attendance || []);
      setStats(res.summary || {});
    }).catch(err => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}><ClipboardCheck size={24} style={{verticalAlign:-4}}/> My Attendance</h1>
      {loading ? <Loader2 className="spin" /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Percentage</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.percentage > 75 ? '#10b981' : '#ef4444' }}>{Math.round(stats.percentage)}%</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Days Present</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.presentCount}</div>
            </div>
            <div className="card" style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Leave/Absence</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.absentCount + stats.leaveCount}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Last 30 Days Record</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.slice(0, 30).map(att => (
                <div key={att._id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 600 }}>{new Date(att.date).toLocaleDateString()}</span>
                  <span className="badge" style={{
                    background: att.status === 'Present' ? '#10b98130' : att.status === 'Absent' ? '#ef444430' : '#f59e0b30',
                    color: att.status === 'Present' ? '#10b981' : att.status === 'Absent' ? '#ef4444' : '#f59e0b',
                  }}>{att.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
