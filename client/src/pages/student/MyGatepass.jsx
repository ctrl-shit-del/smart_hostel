import React, { useEffect, useMemo, useState } from 'react';
import { DoorOpen, Loader2, MessageSquareText, QrCode, Send, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

import api from '../../lib/api';
import { usePortalCallStore } from '../../store/callStore';

const STATUS_COLORS = {
  Pending: '#f59e0b',
  Approved: '#10b981',
  Rejected: '#ef4444',
  Active: '#3b82f6',
  Returned: '#6b7280',
  Expired: '#ef4444',
  Recalled: '#ef4444',
};

const LATE_STATUS_LABELS = {
  pending_student: 'Late message window open',
  submitted: 'Reason sent to warden',
  reviewed: 'Reviewed by warden',
  expired: 'Late message window closed',
};

export default function MyGatepass() {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrImages, setQrImages] = useState({});
  const [messageDrafts, setMessageDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const lastCallUpdate = usePortalCallStore((state) => state.lastCallUpdate);

  const sortedGatepasses = useMemo(
    () => [...gatepasses].sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at)),
    [gatepasses]
  );

  const fetchGatepasses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gatepass');
      const nextGatepasses = response.gatepasses || [];
      setGatepasses(nextGatepasses);

      const nextQrImages = {};
      for (const gatepass of nextGatepasses) {
        if (
          ['Approved', 'Active', 'Returned'].includes(gatepass.status) &&
          (gatepass.qr_code_id || gatepass.qr_token)
        ) {
          const qrValue = gatepass.qr_code_id || gatepass.qr_token;
          nextQrImages[gatepass._id] = await QRCode.toDataURL(qrValue, {
            width: 150,
            margin: 1,
            color: { dark: '#1e293b', light: '#ffffff' },
          });
        }
      }
      setQrImages(nextQrImages);
    } catch (_error) {
      toast.error('Failed to load gatepasses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatepasses();
  }, [lastCallUpdate]);

  const submitLateExcuse = async (gatepassId) => {
    const excuseText = (messageDrafts[gatepassId] || '').trim();
    if (!excuseText) {
      toast.error('Please enter the late-arrival reason before sending it.');
      return;
    }

    setSendingId(gatepassId);
    try {
      const response = await api.post(`/gatepass/${gatepassId}/late-excuse`, { excuse_text: excuseText });
      setGatepasses((current) => current.map((gatepass) => (gatepass._id === gatepassId ? response.gatepass : gatepass)));
      setMessageDrafts((current) => ({ ...current, [gatepassId]: '' }));
      toast.success(response.message || 'Late return message sent.');
    } catch (error) {
      toast.error(error.message || 'Could not send the late-return message.');
    } finally {
      setSendingId(null);
    }
  };

  const playWardenMessage = async (gatepassId, languageHint) => {
    try {
      const response = await api.get(`/gatepass/${gatepassId}/late-message-audio`, {
        params: { language: languageHint || '' },
      });
      const audio = new Audio(`data:${response.mime_type};base64,${response.audio_base64}`);
      await audio.play();
    } catch (error) {
      toast.error(error.message || 'Spoken warden note is not available yet.');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <DoorOpen size={24} /> My Gatepasses
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 className="spin" />
        </div>
      ) : sortedGatepasses.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          No gatepasses found.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {sortedGatepasses.map((gatepass) => {
            const statusColor = STATUS_COLORS[gatepass.status] || '#6b7280';
            const lateStatus = gatepass.late_return?.excuse_status;
            const lateLabel = LATE_STATUS_LABELS[lateStatus];

            return (
              <div key={gatepass._id} className="card" style={{ display: 'flex', flexDirection: 'column', borderTop: `4px solid ${statusColor}` }}>
                <div style={{ padding: 16, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{gatepass.destination}</div>
                    <span className="badge" style={{ background: `${statusColor}20`, color: statusColor }}>
                      {gatepass.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                    {gatepass.reason || 'No extra reason given'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Type:</span>
                      <span style={{ fontWeight: 600 }}>{gatepass.type}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Exit:</span>
                      <span style={{ fontWeight: 600 }}>{format(new Date(gatepass.expected_exit), 'dd MMM, hh:mm a')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Return:</span>
                      <span style={{ fontWeight: 600 }}>{format(new Date(gatepass.expected_return), 'dd MMM, hh:mm a')}</span>
                    </div>
                    {gatepass.qr_code_id && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>QR ID:</span>
                        <span style={{ fontWeight: 700 }}>{gatepass.qr_code_id}</span>
                      </div>
                    )}
                  </div>

                  {gatepass.rejection_reason && gatepass.status === 'Rejected' && (
                    <div style={{ marginTop: 12, padding: 8, background: '#ef444415', color: '#ef4444', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>
                      Rejected: {gatepass.rejection_reason}
                    </div>
                  )}

                  {gatepass.is_overdue && (
                    <div style={{ marginTop: 12, padding: 10, background: '#ef444415', color: '#ef4444', borderRadius: 8, fontSize: '0.78rem', fontWeight: 800 }}>
                      Late return recorded for this leave.
                    </div>
                  )}

                  {lateLabel && (
                    <div style={{ marginTop: 12, padding: 10, background: 'rgba(99,102,241,0.12)', color: '#c4b5fd', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700 }}>
                      {lateLabel}
                      {gatepass.late_return_window_deadline && (
                        <div style={{ marginTop: 4, color: 'var(--text-muted)', fontWeight: 500 }}>
                          Window ends at {format(new Date(gatepass.late_return_window_deadline), 'dd MMM, hh:mm a')}
                        </div>
                      )}
                    </div>
                  )}

                  {gatepass.late_return?.warden_message && (
                    <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>Warden update</div>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => playWardenMessage(gatepass._id, gatepass.late_return?.call_language)}>
                          <Volume2 size={14} /> Listen
                        </button>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{gatepass.late_return.warden_message}</div>
                    </div>
                  )}

                  {gatepass.late_return?.call_summary && (
                    <div style={{ marginTop: 12, padding: 12, background: 'rgba(14,165,233,0.1)', borderRadius: 8, border: '1px solid rgba(14,165,233,0.25)' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: 4 }}>Follow-up call summary</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{gatepass.late_return.call_summary}</div>
                    </div>
                  )}

                  {gatepass.can_submit_late_excuse && (
                    <div style={{ marginTop: 14, padding: 14, borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}>
                        <MessageSquareText size={16} /> Send a quick late-arrival message
                      </div>
                      <textarea
                        className="input"
                        rows={3}
                        placeholder="Tell the warden why you returned late from leave..."
                        value={messageDrafts[gatepass._id] || ''}
                        onChange={(event) =>
                          setMessageDrafts((current) => ({ ...current, [gatepass._id]: event.target.value }))
                        }
                      />
                      <button
                        className="btn btn-primary"
                        style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
                        onClick={() => submitLateExcuse(gatepass._id)}
                        disabled={sendingId === gatepass._id}
                      >
                        {sendingId === gatepass._id ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                        Send To Warden
                      </button>
                    </div>
                  )}
                </div>

                {qrImages[gatepass._id] && (
                  <div style={{ padding: 16, borderTop: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-elevated)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <QrCode size={12} /> Scan at security gate
                    </div>
                    <img src={qrImages[gatepass._id]} alt="QR" style={{ width: 120, height: 120, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <div style={{ marginTop: 8, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {gatepass.qr_code_id ? `Leave QR ID: ${gatepass.qr_code_id}` : 'Legacy signed QR'}
                    </div>
                    {gatepass.security_message && (
                      <div style={{ marginTop: 10, fontSize: '0.78rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {gatepass.security_message}
                      </div>
                    )}
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
