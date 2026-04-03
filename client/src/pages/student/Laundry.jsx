import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function LaundrySchedule() {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/laundry/schedule/me').then((res) => { setSchedule(res); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 200 }} />;

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Laundry Schedule</h1><p>Your personalised pickup schedule by floor</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {schedule?.chota_dhobi && (
          <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #06b6d4' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>🧺 Chota Dhobi (Free)</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 10 }}>Pickup and return — included with hostel fee</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>Your Day</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{schedule.chota_dhobi.day}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>Pickup Time</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{schedule.chota_dhobi.time}</div>
              </div>
            </div>
          </div>
        )}
        {schedule?.profab && (
          <div className="glass-card" style={{ padding: 24, borderLeft: '3px solid #818cf8' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>👔 Profab (Paid)</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 10 }}>Premium laundry service</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(129,140,248,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(129,140,248,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>Pickup Day & Time</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{schedule.profab.day} · {schedule.profab.pickup}</div>
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(129,140,248,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(129,140,248,0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600 }}>Delivery Time</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: 2 }}>{schedule.profab.delivery}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
