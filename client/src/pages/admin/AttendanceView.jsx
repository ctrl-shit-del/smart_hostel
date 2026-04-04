import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck, QrCode, AlertTriangle, Loader2, Moon,
  Camera, CheckCircle2, Power, Users, Calendar,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function AttendanceView() {
  const { user } = useAuthStore();

  const [floor, setFloor]         = useState(1);
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);

  // Night window
  const [windowStatus, setWindowStatus]   = useState(null);
  const [windowLoading, setWindowLoading] = useState(true);
  const [toggling, setToggling]           = useState(false);

  // Tab
  const [tab, setTab] = useState('floor'); // floor | face

  const blockName = user?.block_name || '';

  // ─── Load floor data ──────────────────────────────────────────────────────
  const loadFloor = useCallback(() => {
    if (!blockName) return;
    setLoading(true);
    api.get(`/attendance/floor/${encodeURIComponent(blockName)}/${floor}`)
      .then(res => setData(res.records || []))
      .catch(() => toast.error('Failed to load floor attendance'))
      .finally(() => setLoading(false));
  }, [floor, blockName]);

  useEffect(() => { loadFloor(); }, [loadFloor]);

  // ─── Load window status ───────────────────────────────────────────────────
  const fetchWindowStatus = useCallback(() => {
    api.get('/attendance/window/status')
      .then(res => setWindowStatus(res))
      .catch(() => {})
      .finally(() => setWindowLoading(false));
  }, []);

  useEffect(() => {
    fetchWindowStatus();
    const iv = setInterval(fetchWindowStatus, 30_000);
    return () => clearInterval(iv);
  }, [fetchWindowStatus]);

  // ─── Toggle window ────────────────────────────────────────────────────────
  async function toggleWindow() {
    setToggling(true);
    try {
      const res = await api.post('/attendance/window/toggle', { block_name: blockName });
      toast.success(res.message || 'Window toggled');
      setWindowStatus(prev => ({
        ...prev,
        window_open: res.window_open,
        opened_at: res.window_open ? new Date().toISOString() : prev?.opened_at,
      }));
    } catch (err) {
      toast.error(err.message || 'Failed to toggle window');
    } finally {
      setToggling(false);
    }
  }

  // ─── Other actions ────────────────────────────────────────────────────────
  const generateQR = async () => {
    try {
      await api.post('/attendance/qr/generate', { block: blockName, floor });
      toast.success('QR Code generated');
    } catch { toast.error('QR Gen Failed'); }
  };

  const isOpen   = windowStatus?.window_open;
  const openTime = windowStatus?.opened_at;

  // Face check-in records filter
  const faceRecords = data.filter(r => r.method === 'face');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ClipboardCheck size={26} color="#8b5cf6" />
            Attendance Management
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {blockName || 'All blocks'} — Real-time floor tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={generateQR} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <QrCode size={15} /> Gen Daily QR
          </button>
          <button className="btn btn-secondary" onClick={loadFloor} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Night Window Toggle Card ─────────────────────────────────────────── */}
      <div className="card" style={{
        marginBottom: 20,
        padding: 0,
        overflow: 'hidden',
        border: isOpen ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border)',
        boxShadow: isOpen ? '0 0 32px rgba(6,182,212,0.1)' : undefined,
        transition: 'all 0.4s ease',
      }}>
        <div style={{
          padding: '16px 20px',
          background: isOpen
            ? 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.05))'
            : 'rgba(255,255,255,0.01)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16,
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: isOpen
              ? 'linear-gradient(135deg, #0e7490, #06b6d4)'
              : 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isOpen ? '0 0 18px rgba(6,182,212,0.5)' : 'none',
            flexShrink: 0, transition: 'all 0.4s ease',
          }}>
            <Moon size={20} color={isOpen ? 'white' : 'var(--text-muted)'} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Night Attendance Window
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {windowLoading
                ? 'Checking status…'
                : isOpen
                  ? `Open since ${openTime ? new Date(openTime).toLocaleTimeString() : 'just now'} — students can check in`
                  : 'Currently closed — students cannot check in'}
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            padding: '4px 12px', borderRadius: 99,
            background: isOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isOpen ? '#10b981' : '#ef4444'}40`,
            color: isOpen ? '#10b981' : '#ef4444',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
          }}>
            {windowLoading ? '…' : isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
          </div>

          {/* Toggle switch */}
          <button
            onClick={toggleWindow}
            disabled={toggling || windowLoading}
            title={isOpen ? 'Close attendance window' : 'Open attendance window'}
            style={{
              position: 'relative',
              width: 52, height: 28,
              background: isOpen ? '#06b6d4' : 'rgba(255,255,255,0.12)',
              borderRadius: 99,
              border: 'none',
              cursor: toggling || windowLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s ease',
              boxShadow: isOpen ? '0 0 10px rgba(6,182,212,0.4)' : 'none',
              padding: 0,
              flexShrink: 0,
            }}
          >
            {toggling ? (
              <Loader2 size={14} color="white" style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              <div style={{
                position: 'absolute',
                width: 22, height: 22,
                background: 'white',
                borderRadius: '50%',
                top: 3,
                left: isOpen ? 27 : 3,
                transition: 'left 0.3s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }} />
            )}
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { id: 'floor', label: 'Floor View', Icon: Users },
          { id: 'face',  label: `Face Check-Ins (${faceRecords.length})`, Icon: Camera },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}

        {/* Floor selector — only for floor tab */}
        {tab === 'floor' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Floor:</span>
            {[1, 2, 3, 4].map(f => (
              <button
                key={f}
                className={`btn btn-sm ${floor === f ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFloor(f)}
              >
                F{f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Loader2 size={28} color="#8b5cf6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ROOM</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>STUDENT</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>STATUS</th>
                <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>METHOD</th>
                {tab === 'face' && (
                  <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>TIME</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(tab === 'face' ? faceRecords : data).length === 0 ? (
                <tr>
                  <td colSpan={tab === 'face' ? 5 : 4} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                    {tab === 'face' ? 'No face check-ins yet today' : 'No records for this floor'}
                  </td>
                </tr>
              ) : (
                (tab === 'face' ? faceRecords : data).map((r, i) => {
                  const isPresent = r.status === 'Present';
                  const statusColor = isPresent ? '#10b981' : r.status === 'Absent' ? '#ef4444' : '#f59e0b';
                  const isFaceMethod = r.method === 'face';
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.room_no ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.student_name || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.register_number || ''}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 99,
                          background: `${statusColor}18`,
                          color: statusColor,
                          fontSize: '0.72rem', fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          {isPresent && <CheckCircle2 size={10} />}
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: '0.75rem', fontWeight: 600,
                          color: isFaceMethod ? '#06b6d4' : 'var(--text-muted)',
                        }}>
                          {isFaceMethod && <Camera size={12} />}
                          {r.method?.toUpperCase() || '—'}
                        </span>
                      </td>
                      {tab === 'face' && (
                        <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {r.face_detected_at ? new Date(r.face_detected_at).toLocaleTimeString() : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
