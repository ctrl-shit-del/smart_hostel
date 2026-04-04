import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, CheckCircle2, AlertTriangle, Loader2, Eye, ShieldCheck } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ─── Tuning ───────────────────────────────────────────────────────────────────
const FRAME_INTERVAL_MS = 350;   // how often we send a frame to Python (ms)
const STREAK_NEEDED     = 8;     // consecutive live frames required (~3 s)
const CAPTURE_QUALITY   = 0.7;   // JPEG quality 0-1 for canvas.toDataURL
const CAPTURE_W         = 320;   // downsample before sending (speed)
const CAPTURE_H         = 240;

export default function FaceCheckModal({ onClose, onSuccess }) {
  const videoRef      = useRef(null);
  const capCanvasRef  = useRef(null);   // hidden canvas for frame capture
  const overlayRef    = useRef(null);   // visible overlay canvas
  const streamRef     = useRef(null);
  const timerRef      = useRef(null);
  const prevFrameRef  = useRef(null);   // base64 of previous frame
  const streakRef     = useRef(0);
  const submittingRef = useRef(false);

  const [phase, setPhase]         = useState('check');   // check | camera | scanning | verified | done | error
  const [statusMsg, setStatusMsg] = useState('Checking face detection service…');
  const [progress, setProgress]   = useState(0);
  const [faceState, setFaceState] = useState('none');    // none | small | static | live

  // ── Cleanup ────────────────────────────────────────────────────────────────
  function stopAll() {
    clearInterval(timerRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }
  useEffect(() => () => stopAll(), []);

  // ── Boot sequence ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Ping the Python service
      try {
        const r = await fetch('/face-api/health', { signal: AbortSignal.timeout(4000) });
        if (!r.ok) throw new Error('Service returned non-OK status');
      } catch {
        if (!cancelled) {
          setPhase('error');
          setStatusMsg(
            'Face detection service is not running.\n' +
            'Please start it:\n  cd server/face_service\n  pip install -r requirements.txt\n  python face_service.py'
          );
        }
        return;
      }
      if (cancelled) return;

      // 2. Open camera
      setPhase('camera');
      setStatusMsg('Requesting camera access…');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        await new Promise(r => { video.onloadedmetadata = r; });
        await video.play();
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setStatusMsg(
            err.name === 'NotAllowedError'
              ? 'Camera permission denied — please allow it and retry.'
              : `Camera error: ${err.message}`
          );
        }
        return;
      }
      if (cancelled) return;

      // 3. Start sending frames
      setPhase('scanning');
      setStatusMsg('Position your face in the frame');
      timerRef.current = setInterval(() => sendFrame(), FRAME_INTERVAL_MS);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Capture + send one frame ───────────────────────────────────────────────
  const sendFrame = useCallback(async () => {
    const video  = videoRef.current;
    const canvas = capCanvasRef.current;
    if (!video || !canvas || video.readyState < 2 || submittingRef.current) return;

    // Draw mirrored frame to hidden canvas
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -CAPTURE_W, 0, CAPTURE_W, CAPTURE_H);
    ctx.restore();

    const currentFrame = canvas.toDataURL('image/jpeg', CAPTURE_QUALITY);
    const prevFrame    = prevFrameRef.current;
    prevFrameRef.current = currentFrame;

    let result;
    try {
      const res = await fetch('/face-api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: currentFrame, prev_frame: prevFrame }),
        signal: AbortSignal.timeout(2000),
      });
      result = await res.json();
    } catch {
      // Network timeout or parse error — skip this frame
      return;
    }

    if (submittingRef.current) return;

    drawOverlay(result);
    processResult(result);
  }, []);

  // ── Process detection result ───────────────────────────────────────────────
  function processResult(result) {
    const { face_detected, face_area, is_live, motion_score } = result;

    if (!face_detected) {
      streak(0, 'none', 'No face detected — look at the camera 👀');
      return;
    }
    if (face_area < 0.03) {
      streak(0, 'small', 'Move closer to the camera 📏');
      return;
    }
    if (!prevFrameRef.current) {
      // Still collecting first frame pair
      setFaceState('live');
      setStatusMsg('Hold still while we verify… 🔍');
      return;
    }
    if (!is_live) {
      streakRef.current = Math.max(0, streakRef.current - 1);
      setFaceState('static');
      setProgress(Math.round((streakRef.current / STREAK_NEEDED) * 100));
      setStatusMsg(`Static detected (motion: ${motion_score?.toFixed(1)}) — blink or move slightly 👁️`);
      return;
    }

    // Live face!
    streakRef.current = Math.min(streakRef.current + 1, STREAK_NEEDED);
    const pct = Math.round((streakRef.current / STREAK_NEEDED) * 100);
    setFaceState('live');
    setProgress(pct);
    if      (pct < 40)  setStatusMsg('Liveness detected — keep going 🟡');
    else if (pct < 80)  setStatusMsg('Almost there… 🟢');
    else                setStatusMsg('Verified! Submitting… ✅');

    if (streakRef.current >= STREAK_NEEDED && !submittingRef.current) {
      submittingRef.current = true;
      clearInterval(timerRef.current);
      submitAttendance();
    }
  }

  function streak(val, state, msg) {
    streakRef.current = val;
    setFaceState(state);
    setProgress(0);
    setStatusMsg(msg);
  }

  // ── Draw overlay on visible canvas ─────────────────────────────────────────
  function drawOverlay(result) {
    const canvas = overlayRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;
    const W = video.clientWidth  || 480;
    const H = video.clientHeight || 360;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const pct   = Math.round((streakRef.current / STREAK_NEEDED) * 100);
    const color = !result.face_detected ? '#6b7280'
      : result.is_live  ? (pct > 75 ? '#10b981' : '#06b6d4')
      : '#f59e0b';

    // Face oval (centred — Haar cascade doesn't return normalised coords, so use a guide oval)
    const cx = W / 2, cy = H / 2.1;
    const rx = W * 0.26, ry = H * 0.40;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.shadowBlur  = result.face_detected ? 12 : 0;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Corner marks
    const bS = 18;
    [ [cx - rx, cy - ry,  1,  1],
      [cx + rx, cy - ry, -1,  1],
      [cx - rx, cy + ry,  1, -1],
      [cx + rx, cy + ry, -1, -1],
    ].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * bS, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + dy * bS);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.stroke();
    });

    // Liveness arc
    if (pct > 0) {
      const r = Math.min(rx, ry) + 16;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.shadowBlur  = 8;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }
  }

  // ── Submit attendance ──────────────────────────────────────────────────────
  async function submitAttendance() {
    stopAll();
    setPhase('verified');
    setStatusMsg('Submitting attendance…');
    try {
      const res = await api.post('/attendance/face/checkin', { face_verified: true });
      setPhase('done');
      setStatusMsg(res.message || 'Attendance marked!');
      toast.success('Attendance marked via face check-in! 🎉');
      setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
    } catch (err) {
      setPhase('error');
      setStatusMsg(err.message || 'Server error — please try again.');
      toast.error(err.message || 'Failed to submit');
    }
  }

  // ── Derived UI ─────────────────────────────────────────────────────────────
  const statusColor =
    (phase === 'verified' || phase === 'done') ? '#10b981' :
    faceState === 'live'   ? (progress > 75 ? '#10b981' : '#06b6d4') :
    faceState === 'static' ? '#f59e0b' :
    phase === 'error'      ? '#ef4444' :
    'var(--text-muted)';

  const stepsDone = {
    camera:   phase !== 'check' && phase !== 'error',
    face:     faceState !== 'none' && faceState !== 'small',
    liveness: phase === 'verified' || phase === 'done',
    recorded: phase === 'done',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 780,
        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(139,92,246,0.06))',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#0e7490,#06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(6,182,212,0.4)',
            }}>
              <Camera size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>Night Attendance Check-In</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>OpenCV Face Detection · Liveness Verification</div>
            </div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6 }}
            onClick={() => { stopAll(); onClose(); }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {/* Camera panel */}
          <div style={{
            flex: '1 1 300px', position: 'relative', background: '#050508',
            minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Hidden capture canvas */}
            <canvas ref={capCanvasRef} width={CAPTURE_W} height={CAPTURE_H} style={{ display: 'none' }} />

            {/* Live video (mirrored) */}
            <video ref={videoRef} playsInline muted style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scaleX(-1)',
              display: phase === 'scanning' ? 'block' : 'none',
            }} />

            {/* Overlay canvas */}
            <canvas ref={overlayRef} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              pointerEvents: 'none',
              display: phase === 'scanning' ? 'block' : 'none',
            }} />

            {/* Non-scanning states */}
            {(phase === 'check' || phase === 'camera') && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <Loader2 size={40} color="#06b6d4" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{statusMsg}</div>
              </div>
            )}
            {phase === 'verified' && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <ShieldCheck size={56} color="#10b981" style={{ marginBottom: 16 }} />
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>Identity Verified</div>
              </div>
            )}
            {phase === 'done' && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <CheckCircle2 size={56} color="#10b981" style={{ marginBottom: 16 }} />
                <div style={{ color: '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>Attendance Marked!</div>
              </div>
            )}
            {phase === 'error' && (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
                <div style={{ color: '#ef4444', fontSize: '0.8rem', maxWidth: 280, margin: '0 auto', whiteSpace: 'pre-line', textAlign: 'left', fontFamily: 'monospace', lineHeight: 1.7 }}>
                  {statusMsg}
                </div>
              </div>
            )}

            {/* Corner decorations */}
            {phase === 'scanning' && [
              { top: 14, left: 14 }, { top: 14, right: 14 },
              { bottom: 14, left: 14 }, { bottom: 14, right: 14 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', ...pos, width: 22, height: 22,
                borderTop:    i < 2    ? `2px solid ${statusColor}` : 'none',
                borderBottom: i >= 2   ? `2px solid ${statusColor}` : 'none',
                borderLeft:   i % 2 === 0 ? `2px solid ${statusColor}` : 'none',
                borderRight:  i % 2 === 1 ? `2px solid ${statusColor}` : 'none',
                transition: 'border-color 0.3s', pointerEvents: 'none',
              }} />
            ))}
          </div>

          {/* Info panel */}
          <div style={{ flex: '1 1 250px', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Steps */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 12 }}>
                VERIFICATION STEPS
              </div>
              {[
                { key: 'camera',   Icon: Camera,       label: 'Camera Active' },
                { key: 'face',     Icon: Eye,          label: 'Face Detected' },
                { key: 'liveness', Icon: ShieldCheck,  label: 'Liveness Confirmed' },
                { key: 'recorded', Icon: CheckCircle2, label: 'Attendance Recorded' },
              ].map(({ key, Icon, label }, i, arr) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  opacity: stepsDone[key] ? 1 : 0.45, transition: 'opacity 0.3s',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: stepsDone[key] ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${stepsDone[key] ? '#10b981' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.3s',
                  }}>
                    <Icon size={13} color={stepsDone[key] ? '#10b981' : 'var(--text-muted)'} />
                  </div>
                  <span style={{
                    fontSize: '0.82rem', flex: 1,
                    fontWeight: stepsDone[key] ? 600 : 400,
                    color: stepsDone[key] ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>{label}</span>
                  {stepsDone[key] && <CheckCircle2 size={13} color="#10b981" />}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {phase === 'scanning' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>LIVENESS</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor }}>{progress}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progress}%`,
                    background: `linear-gradient(90deg,#06b6d4,${statusColor})`,
                    borderRadius: 99, transition: 'width 0.2s ease, background 0.3s',
                    boxShadow: `0 0 8px ${statusColor}60`,
                  }} />
                </div>
              </div>
            )}

            {/* Status chip */}
            <div style={{
              padding: '12px 14px', borderRadius: 10, minHeight: 48,
              background: `${statusColor}12`, border: `1px solid ${statusColor}30`,
              fontSize: '0.82rem', color: statusColor, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.3s',
            }}>
              {(phase === 'check' || phase === 'camera') && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
              {phase === 'scanning'  && <Eye size={14} style={{ flexShrink: 0 }} />}
              {(phase === 'verified' || phase === 'done') && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
              {phase === 'error'     && <AlertTriangle size={14} style={{ flexShrink: 0 }} />}
              <span>{statusMsg.split('\n')[0]}</span>
            </div>

            {/* Tips */}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>💡 Tips for best results</div>
              <div>• Ensure good lighting on your face</div>
              <div>• Face the camera directly</div>
              <div>• Blink or gently nod to confirm liveness</div>
              <div>• Do not use a photo or screen</div>
            </div>

            <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }}
              onClick={() => { stopAll(); onClose(); }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
