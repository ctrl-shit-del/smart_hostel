import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';

export default function AttendanceView() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => { fetchAll(); }, [date]);

  const fetchAll = async () => {
    try {
      const [rRes, aRes] = await Promise.allSettled([
        api.get(`/attendance?date=${date}&limit=200`),
        api.get('/attendance/anomalies'),
      ]);
      setRecords(rRes.value?.records || []);
      setAnomalies(aRes.value?.anomalies || []);
    } catch {}
    setLoading(false);
  };

  const present = records.filter((r) => r.status === 'Present').length;
  const absent = records.filter((r) => r.status === 'Absent').length;
  const rate = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Attendance View</h1><p>Floor-wise daily attendance with anomaly detection</p></div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input type="date" className="input" style={{ width: 180 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="stats-grid" style={{ flex: 1 }}>
          <div className="glass-card stat-card" style={{ padding: 14 }}>
            <div className="stat-value" style={{ fontSize: '1.5rem', background: '#10b981', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{present}</div>
            <div className="stat-label">Present</div>
          </div>
          <div className="glass-card stat-card" style={{ padding: 14 }}>
            <div className="stat-value" style={{ fontSize: '1.5rem', background: '#ef4444', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{absent}</div>
            <div className="stat-label">Absent</div>
          </div>
          <div className="glass-card stat-card" style={{ padding: 14 }}>
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{rate}%</div>
            <div className="stat-label">Attendance Rate</div>
          </div>
          <div className="glass-card stat-card" style={{ padding: 14 }}>
            <div className="stat-value" style={{ fontSize: '1.5rem', background: '#f59e0b', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{anomalies.length}</div>
            <div className="stat-label">Anomalies</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['overview', 'anomalies'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}>{t === 'overview' ? 'Attendance Records' : `Anomalies (${anomalies.length})`}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="glass-card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Student</th><th>Floor</th><th>Room</th><th>Status</th><th>Method</th><th>Time</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center' }}>Loading...</td></tr>}
                {!loading && records.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No records for {date}</td></tr>}
                {records.map((r, i) => (
                  <tr key={i}>
                    <td><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{r.student_name}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.register_number}</div></td>
                    <td>Floor {r.floor_no}</td>
                    <td>{r.room_no}</td>
                    <td><span className={`badge ${r.status === 'Present' ? 'badge-success' : r.status === 'On Leave' ? 'badge-info' : 'badge-danger'}`}>{r.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.method || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.wifi_detected_at ? format(new Date(r.wifi_detected_at), 'h:mm a') : r.qr_scanned_at ? format(new Date(r.qr_scanned_at), 'h:mm a') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'anomalies' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {anomalies.length === 0 && <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No anomalies detected 🎉</div>}
          {anomalies.map((a, i) => (
            <div key={i} className="glass-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #ef4444' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{a.student_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.register_number} · Room {a.room_no} · Floor {a.floor_no}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-danger">{a.consecutive_absences} consecutive nights absent</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
