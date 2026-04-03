import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle, Users, MessageSquare, DoorOpen, Heart, Building2, Activity, Zap } from 'lucide-react';

const STAT_CARDS = [
  { key: 'totalStudents', label: 'Total Students', icon: Users, color: '#6366f1' },
  { key: 'todayPresent', label: 'Present Tonight', icon: Activity, color: '#10b981' },
  { key: 'activeComplaints', label: 'Active Complaints', icon: MessageSquare, color: '#f59e0b' },
  { key: 'pendingGatepasses', label: 'Pending Passes', icon: DoorOpen, color: '#06b6d4' },
  { key: 'openEmergencies', label: 'Open SOS', icon: Heart, color: '#ef4444' },
  { key: 'vacantRooms', label: 'Vacant Rooms', icon: Building2, color: '#8b5cf6' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const [overviewRes, trendRes] = await Promise.allSettled([
        api.get('/analytics/overview'),
        api.get('/analytics/attendance/trend?days=7'),
      ]);
      if (overviewRes.value) setOverview(overviewRes.value.overview);
      if (trendRes.value) setTrend(trendRes.value.trend || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const HealthScoreRing = ({ score }) => {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const r = 54, circumference = 2 * Math.PI * r;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.75rem', fontWeight: 900, color }}>{score}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Health Score</div>
        </div>
      </div>
    );
  };

  const customTooltipStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.8rem' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Real-time hostel operations overview · Auto-refreshes every 30s</p>
      </div>

      {/* Stats grid */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="glass-card stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-value" style={{ background: color, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {loading ? '—' : overview?.[key] ?? '—'}
                </div>
                <div className="stat-label">{label}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Attendance trend chart */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>📊 7-Day Attendance Trend</h3>
          {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} dot={false} name="Present" />
                <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Health Score + Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Hostel Health Score</h3>
            {loading ? <div className="skeleton" style={{ width: 140, height: 140, borderRadius: '50%' }} /> : <HealthScoreRing score={overview?.healthScore || 0} />}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Composite: attendance + complaints + SLA + safety</div>
          </div>

          {/* SLA Breach Alert */}
          {overview?.slaBreaches > 0 && (
            <div className="alert-panel" style={{ padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> {overview.slaBreaches} SLA Breach{overview.slaBreaches > 1 ? 'es' : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Complaints exceeded resolution time</div>
              <button className="btn btn-danger btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/admin/complaints')}>View →</button>
            </div>
          )}

          {/* Overdue Alert */}
          {overview?.overdueGatepasses > 0 && (
            <div className="alert-panel warning" style={{ padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>⚠️ {overview.overdueGatepasses} Overdue Return{overview.overdueGatepasses > 1 ? 's' : ''}</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/admin/gatepass')}>View →</button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { label: '🏠 Room Allocation', path: '/admin/rooms', desc: 'Visual room grid, bed assignment' },
          { label: '🔧 Complaints', path: '/admin/complaints', desc: 'AI-routed, SLA tracked' },
          { label: '🚪 Gatepass', path: '/admin/gatepass', desc: 'Approvals, overdue alerts' },
          { label: '📋 Attendance', path: '/admin/attendance', desc: 'Floor-wise, anomaly flags' },
          { label: '🚨 Health Events', path: '/admin/health', desc: 'SOS log, response times' },
          { label: '📢 Announcements', path: '/admin/announcements', desc: 'Push to students instantly' },
        ].map(({ label, path, desc }) => (
          <button key={path} className="glass-card" onClick={() => navigate(path)}
            style={{ padding: '16px', textAlign: 'left', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{label}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
