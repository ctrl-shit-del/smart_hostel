import React, { useState, useEffect } from 'react';
import { ClipboardCheck, QrCode, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AttendanceView() {
  const [floor, setFloor] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/attendance/floor/A Block/${floor}`)
      .then(res => setData(res.records || []))
      .catch(() => toast.error('Failed to load floor attendance'))
      .finally(() => setLoading(false));
  }, [floor]);

  const generateQR = async () => {
    try {
      await api.post('/attendance/qr/generate');
      toast.success('QR Code sent to displays');
    } catch { toast.error('QR Gen Failed'); }
  };

  const syncWifi = async () => {
    try {
      await api.post('/attendance/wifi/sync');
      toast.success('WiFi logs synced');
    } catch { toast.error('WiFi sync failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}><ClipboardCheck size={24} style={{verticalAlign:-4}}/> Floor Attendance</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={generateQR}><QrCode size={16}/> Gen Daily QR</button>
          <button className="btn btn-primary" onClick={syncWifi}>Simulate WiFi Sync</button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        Floor: {[1,2,3,4].map(f => (
          <button key={f} className={`btn btn-sm ${floor === f ? 'btn-primary' : 'btn-secondary'}`} style={{ marginLeft: 8 }} onClick={() => setFloor(f)}>F{f}</button>
        ))}
      </div>

      {loading ? <Loader2 className="spin" /> : (
        <div className="card">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: 12 }}>Room</th>
                <th style={{ padding: 12 }}>Student</th>
                <th style={{ padding: 12 }}>Status</th>
                <th style={{ padding: 12 }}>Method</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 12 }}>{r.room_no}</td>
                  <td style={{ padding: 12 }}>{r.student_name} ({r.register_number})</td>
                  <td style={{ padding: 12 }}>
                    <span className="badge" style={{ color: r.status === 'Present' ? '#10b981' : '#ef4444' }}>{r.status}</span>
                  </td>
                  <td style={{ padding: 12, color: 'var(--text-muted)' }}>{r.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
