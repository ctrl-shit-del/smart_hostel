import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function MyAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/student/me').then((res) => { setRecords(res.records || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const present = records.filter((r) => r.status === 'Present').length;
  const rate = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>My Attendance</h1><p>Last 30 nights attendance history</p></div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[{ label: 'Present', val: present, color: '#10b981' }, { label: 'Absent', val: records.length - present, color: '#ef4444' }, { label: 'Attendance Rate', val: `${rate}%`, color: rate >= 75 ? '#10b981' : '#ef4444' }].map((s) => (
          <div key={s.label} className="glass-card stat-card" key={s.label}>
            <div className="stat-value" style={{ background: s.color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 300 }} /> : (
        <div className="glass-card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Status</th><th>Method</th></tr></thead>
              <tbody>
                {records.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No records</td></tr>}
                {records.map((r, i) => (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td><span className={`badge ${r.status === 'Present' ? 'badge-success' : r.status === 'On Leave' ? 'badge-info' : 'badge-danger'}`}>{r.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{r.method || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
