import React, { useEffect, useState } from 'react';
import api from '../../lib/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function MessInfo() {
  const [weekly, setWeekly] = useState({});
  const [crowd, setCrowd] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));

  useEffect(() => {
    Promise.allSettled([api.get('/mess/menu/week'), api.get('/mess/crowd')]).then(([weeklyRes, crowdRes]) => {
      setWeekly(weeklyRes.value?.weekly || {});
      setCrowd(crowdRes.value?.crowd || null);
      setLoading(false);
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>Mess Menu</h1><p>Weekly menu and real-time crowd prediction</p></div>

      {/* Crowd prediction */}
      {crowd && (
        <div className={`alert-panel ${crowd.crowd_level === 'Very High' || crowd.crowd_level === 'High' ? 'warning' : 'info'}`} style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700 }}>🍽️ Live Crowd: {crowd.crowd_level} — {crowd.estimated_fill_percent}% full</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{crowd.recommendation} · Current meal: {crowd.meal}</div>
        </div>
      )}

      {/* Day selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {DAYS.map((day) => (
          <button key={day} onClick={() => setActiveDay(day)} className={`btn ${activeDay === day ? 'btn-primary' : 'btn-secondary'} btn-sm`} style={{ flexShrink: 0 }}>
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(weekly[activeDay] || []).length === 0 && <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Menu not available for {activeDay}</div>}
          {(weekly[activeDay] || []).map((item, i) => (
            <div key={i} className="glass-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.meal}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>{item.items?.map((it) => it.name).join(', ') || 'Check mess board'}</div>
                {item.caterer && <div style={{ fontSize: '0.75rem', color: '#818cf8', marginTop: 2 }}>Caterer: {item.caterer}</div>}
              </div>
              <span className={`badge ${item.type === 'Veg' ? 'badge-success' : item.type === 'Non-Veg' ? 'badge-danger' : 'badge-brand'}`}>{item.type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
