import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, Camera, Moon, Lock, CheckCircle2,
  Loader2, Calendar, Activity, WifiOff, ShieldCheck,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import FaceCheckModal from '../../components/FaceCheckModal';

const STATUS_COLORS = {
  Present:  { bg: '#10b98120', text: '#10b981' },
  Absent:   { bg: '#ef444420', text: '#ef4444' },
  'On Leave': { bg: '#f59e0b20', text: '#f59e0b' },
  'On Outing': { bg: '#06b6d420', text: '#06b6d4' },
};

export default function MyAttendance() {
  const [history, setHistory]     = useState([]);
  const [stats, setStats]         = useState({});
  const [histLoading, setHistLoading] = useState(true);

  // Night window state
  const [windowStatus, setWindowStatus] = useState(null); // null | { window_open, already_checked_in, opened_at }
  const [windowLoading, setWindowLoading] = useState(true);
  const [showCamera, setShowCamera]  = useState(false);

  // ─── Load history ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/attendance')
      .then(res => {
        const records = res.records || [];
        setHistory(records);
        const present = records.filter(r => r.status === 'Present').length;
        const absent  = records.filter(r => r.status === 'Absent').length;
        const leave   = records.filter(r => r.status === 'On Leave' || r.status === 'On Outing').length;
        const total   = present + absent + leave;
        setStats({ presentCount: present, absentCount: absent, leaveCount: leave, percentage: total ? (present / total) * 100 : 0 });
      })
      .catch(() => toast.error('Could not load attendance history'))
      .finally(() => setHistLoading(false));
  }, []);

  // ─── Poll window status every 30 s ──────────────────────────────────────
  const fetchWindowStatus = useCallback(() => {
    api.get('/attendance/window/status')
      .then(res => setWindowStatus(res))
      .catch(() => setWindowStatus(null))
      .finally(() => setWindowLoading(false));
  }, []);

  useEffect(() => {
    fetchWindowStatus();
    const interval = setInterval(fetchWindowStatus, 30_000);
    return () => clearInterval(interval);
  }, [fetchWindowStatus]);

  // ─── Refresh after successful check-in ───────────────────────────────────
  function handleCheckinSuccess() {
    fetchWindowStatus();
    // Also refresh history
    setHistLoading(true);
    api.get('/attendance/student/me')
      .then(res => {
        setHistory(res.records || []);
      })
      .finally(() => setHistLoading(false));
  }

  const percentage = stats.percentage ?? 0;
  const pctColor = percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 34; // r=34
  const dash = (percentage / 100) * circumference;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardCheck size={26} color="#06b6d4" />
          My Attendance
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Track your presence and mark tonight's check-in
        </p>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {/* Ring chart */}
        <div className="card" style={{ padding: '20px 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width={80} height={80} style={{ flexShrink: 0 }}>
            <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
            <circle
              cx={40} cy={40} r={34} fill="none"
              stroke={pctColor} strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={circumference / 4}
              style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${pctColor})` }}
            />
            <text x={40} y={45} textAnchor="middle" fill={pctColor} fontSize={14} fontWeight={800}>
              {Math.round(percentage)}%
            </text>
          </svg>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attendance</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: pctColor }}>
              {percentage >= 75 ? 'Good' : percentage >= 50 ? 'At Risk' : 'Critical'}
            </div>
          </div>
        </div>

        {[
          { label: 'Days Present',  value: stats.presentCount ?? '—', color: '#10b981', Icon: CheckCircle2 },
          { label: 'Absent',        value: stats.absentCount  ?? '—', color: '#ef4444', Icon: WifiOff },
          { label: 'Leave / Outing',value: stats.leaveCount   ?? '—', color: '#f59e0b', Icon: Calendar },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Icon size={14} color={color} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{histLoading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* ── Night Check-In Panel ─────────────────────────────────────────────── */}
      <div className="card" style={{
        marginBottom: 24,
        padding: 0,
        overflow: 'hidden',
        border: windowStatus?.window_open
          ? '1px solid rgba(6,182,212,0.35)'
          : '1px solid var(--border)',
        boxShadow: windowStatus?.window_open
          ? '0 0 30px rgba(6,182,212,0.08)'
          : undefined,
        transition: 'all 0.4s ease',
      }}>
        {/* Panel header */}
        <div style={{
          padding: '16px 20px',
          background: windowStatus?.window_open
            ? 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.08))'
            : 'rgba(255,255,255,0.02)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: windowStatus?.window_open
              ? 'linear-gradient(135deg, #0e7490, #06b6d4)'
              : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: windowStatus?.window_open ? '0 0 14px rgba(6,182,212,0.4)' : 'none',
            transition: 'all 0.4s ease',
          }}>
            <Moon size={16} color={windowStatus?.window_open ? 'white' : 'var(--text-muted)'} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Night Attendance Check-In</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {windowStatus?.window_open
                ? `Window opened at ${windowStatus.opened_at ? new Date(windowStatus.opened_at).toLocaleTimeString() : 'just now'}`
                : 'Warden controls when this window is open'}
            </div>
          </div>
          {/* Status badge */}
          <div style={{
            padding: '4px 12px', borderRadius: 99,
            background: windowStatus?.window_open ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${windowStatus?.window_open ? '#10b981' : '#ef4444'}40`,
            color: windowStatus?.window_open ? '#10b981' : '#ef4444',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
          }}>
            {windowLoading ? '…' : windowStatus?.window_open ? '🟢 OPEN' : '🔴 CLOSED'}
          </div>
        </div>

        {/* Panel body */}
        <div style={{ padding: '24px 20px' }}>
          {windowLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-muted)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Checking attendance window status…
            </div>
          ) : windowStatus?.already_checked_in ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid #10b98140',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShieldCheck size={22} color="#10b981" />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>You're checked in for today! ✅</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Attendance already marked via face verification
                </div>
              </div>
            </div>
          ) : !windowStatus?.window_open ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={22} color="#ef4444" />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Check-in window is closed</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Your warden will open the window at night for attendance. This page checks every 30 seconds.
                </div>
              </div>
            </div>
          ) : (
            /* Window is OPEN and not yet checked in */
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  🌙 Attendance window is open!
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Your warden has enabled check-in for your block. Click the button to open your camera and verify your presence using face liveness detection.
                </div>
              </div>
              <button
                className="btn btn-primary"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #0e7490, #06b6d4)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.35)',
                  borderRadius: 12, border: 'none', cursor: 'pointer',
                  animation: 'pulse 2s infinite',
                }}
                onClick={() => setShowCamera(true)}
              >
                <Camera size={18} />
                Mark Attendance
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={16} color="#06b6d4" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Last 30 Days Record</span>
        </div>
        {histLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#06b6d4' }} />
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No attendance records found.</div>
        ) : (
          <div>
            {history.slice(0, 30).map((att, i) => {
              const c = STATUS_COLORS[att.status] || { bg: 'rgba(255,255,255,0.05)', text: 'var(--text-muted)' };
              const method = att.method ? att.method.toUpperCase() : '—';
              const isFace = att.method === 'face';
              return (
                <div key={att._id || i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 20px',
                  borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c.text,
                    boxShadow: `0 0 6px ${c.text}80`,
                    flexShrink: 0,
                  }} />
                  <span style={{ flex: 1, fontWeight: 600, fontSize: '0.875rem' }}>
                    {new Date(att.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  {isFace && (
                    <span style={{ fontSize: '0.7rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Camera size={11} /> Face
                    </span>
                  )}
                  {!isFace && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{method}</span>
                  )}
                  <span style={{
                    padding: '3px 10px', borderRadius: 99,
                    background: c.bg, color: c.text,
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {att.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Face Modal ───────────────────────────────────────────────────────── */}
      {showCamera && (
        <FaceCheckModal
          onClose={() => setShowCamera(false)}
          onSuccess={handleCheckinSuccess}
        />
      )}
    </div>
  );
}
