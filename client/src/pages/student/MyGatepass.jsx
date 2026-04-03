import React, { useState, useEffect } from 'react';
import { DoorOpen, Loader2, QrCode } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import QRCode from 'qrcode';

const STATUS_COLORS = {
  'Pending': '#f59e0b', 'Approved': '#10b981', 'Rejected': '#ef4444',
  'Active': '#3b82f6', 'Returned': '#6b7280', 'Expired': '#ef4444', 'Recalled': '#ef4444'
};

export default function MyGatepass() {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrImages, setQrImages] = useState({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/gatepass');
        const gps = res.gatepasses || [];
        setGatepasses(gps);
        
        // Gen QRs for approved/active
        const qrs = {};
        for (const gp of gps) {
          if (gp.qr_token && (gp.status === 'Approved' || gp.status === 'Active')) {
            qrs[gp._id] = await QRCode.toDataURL(gp.qr_token, { width: 150, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
          }
        }
        setQrImages(qrs);
      } catch (err) {
        toast.error('Failed to load gatepasses');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <DoorOpen size={24} /> My Gatepasses
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" /></div>
      ) : gatepasses.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No gatepasses found</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {gatepasses.map(gp => {
            const sc = STATUS_COLORS[gp.status] || '#6b7280';
            return (
              <div key={gp._id} className="card" style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${sc}` }}>
                <div style={{ padding: 16, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{gp.destination}</div>
                    <span className="badge" style={{ background: `${sc}20`, color: sc }}>{gp.status}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>{gp.reason}</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                      <span style={{ fontWeight: 600 }}>{gp.type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Exit:</span>
                      <span style={{ fontWeight: 600 }}>{format(new Date(gp.expected_exit), 'dd MMM, hh:mm a')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Return:</span>
                      <span style={{ fontWeight: 600 }}>{format(new Date(gp.expected_return), 'dd MMM, hh:mm a')}</span>
                    </div>
                  </div>

                  {gp.status === 'Rejected' && gp.rejection_reason && (
                    <div style={{ marginTop: 12, padding: 8, background: '#ef444415', color: '#ef4444', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                      Rejected: {gp.rejection_reason}
                    </div>
                  )}
                  {gp.is_overdue && (
                    <div style={{ marginTop: 12, padding: 8, background: '#ef444415', color: '#ef4444', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                      OVERDUE! Return immediately.
                    </div>
                  )}
                </div>

                {qrImages[gp._id] && (
                  <div style={{ padding: 16, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <QrCode size={12}/> Scan at security gate
                    </div>
                    <img src={qrImages[gp._id]} alt="QR" style={{ width: 120, height: 120, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
