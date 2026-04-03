import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { format } from 'date-fns';
import QRCode from 'qrcode';

const STATUS = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger', Active: 'badge-info', Returned: 'badge-muted', Expired: 'badge-danger' };

export default function MyGatepass() {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModal, setQrModal] = useState(null);

  useEffect(() => {
    api.get('/gatepass').then((res) => { setPasses(res.gatepasses || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const showQR = async (pass) => {
    if (!pass.qr_token) return;
    const qrDataUrl = await QRCode.toDataURL(pass.qr_token, { width: 280, margin: 2, color: { dark: '#f1f5f9', light: '#16161f' } });
    setQrModal({ pass, qrDataUrl });
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>My Gatepasses</h1><p>View and track your pass applications</p></div>
      {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {passes.length === 0 && <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No gatepass applications yet.</div>}
          {passes.map((p) => (
            <div key={p._id} className="glass-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.type} → {p.destination}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Exit: {format(new Date(p.expected_exit), 'dd MMM h:mm a')} · Return: {format(new Date(p.expected_return), 'dd MMM h:mm a')}
                </div>
                {p.is_overdue && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>⚠️ OVERDUE</span>}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge ${STATUS[p.status] || 'badge-muted'}`}>{p.status}</span>
                {p.qr_token && p.status === 'Approved' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => showQR(p)}>Show QR</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setQrModal(null)}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 4 }}>Gate Pass QR Code</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>{qrModal.pass.type} · {qrModal.pass.destination}</div>
            <img src={qrModal.qrDataUrl} alt="QR Code" style={{ borderRadius: 'var(--radius-md)', width: 240, height: 240 }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 12 }}>Show this QR to the guard at exit and entry</div>
            <button className="btn btn-secondary" style={{ marginTop: 16, width: '100%' }} onClick={() => setQrModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
