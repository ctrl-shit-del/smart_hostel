import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function StaffDirectory() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/staff/directory').then((res) => { setStaff(res.staff || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Staff Directory</h1><p>Hostel staff contact directory</p></div>
      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {staff.map((s, i) => (
            <div key={i} className="glass-card" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {s.name?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#818cf8' }}>{s.staff_role || s.role?.replace('_', ' ')}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {s.phone}</div>}
                {s.email && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>✉️ {s.email}</div>}
                {s.shift_start && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🕘 {s.shift_start} – {s.shift_end}</div>}
                {s.is_campus_wide && <span className="badge badge-brand" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Campus-wide</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
