import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Phone, Send, Users, Volume2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import api from '../../lib/api';
import { usePortalCallStore } from '../../store/callStore';

const DECISION_OPTIONS = [
  { value: 'meet_warden', label: 'Ask To Meet Warden' },
  { value: 'clear', label: 'Clear Student' },
  { value: 'call_student', label: 'Portal Call Follow-up' },
];

const formatDateTime = (value) => (value ? format(new Date(value), 'dd MMM, hh:mm a') : '—');

export default function StudentsDesk() {
  const [lateArrivals, setLateArrivals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [callDrafts, setCallDrafts] = useState({});
  const requestOutgoingCall = usePortalCallStore((state) => state.requestOutgoingCall);
  const lastCallUpdate = usePortalCallStore((state) => state.lastCallUpdate);

  const stats = useMemo(() => ({
    total: lateArrivals.length,
    awaitingReview: lateArrivals.filter((gp) => gp.late_return?.excuse_status === 'submitted').length,
    callDue: lateArrivals.filter((gp) => ['pending', 'ringing'].includes(gp.late_return?.call_status)).length,
  }), [lateArrivals]);

  const fetchLateArrivals = async () => {
    setLoading(true);
    try {
      const response = await api.get('/gatepass/late-arrivals');
      setLateArrivals(response.lateArrivals || []);
    } catch (error) {
      toast.error(error.message || 'Could not load late-return students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLateArrivals();
  }, [lastCallUpdate]);

  const submitLateReview = async (gatepassId) => {
    const draft = reviewDrafts[gatepassId] || {};
    setUpdatingId(gatepassId);
    try {
      await api.put(`/gatepass/${gatepassId}/late-review`, {
        decision: draft.decision || 'meet_warden',
        message: draft.message || '',
      });
      toast.success('Warden decision saved.');
      fetchLateArrivals();
    } catch (error) {
      toast.error(error.message || 'Could not save the warden decision.');
    } finally {
      setUpdatingId(null);
    }
  };

  const submitCallOutcome = async (gatepassId, notPicked = false) => {
    const draft = callDrafts[gatepassId] || {};
    setUpdatingId(gatepassId);
    try {
      await api.post(`/gatepass/${gatepassId}/late-call`, {
        transcript: draft.transcript || '',
        language: draft.language || '',
        decision: draft.decision || '',
        message: draft.message || '',
        not_picked: notPicked,
      });
      toast.success(notPicked ? 'Marked as not picked.' : 'Call transcript saved.');
      fetchLateArrivals();
    } catch (error) {
      toast.error(error.message || 'Could not save the call outcome.');
    } finally {
      setUpdatingId(null);
    }
  };

  const startPortalCall = (gatepass) => {
    requestOutgoingCall({
      gatepassId: gatepass._id,
      toUserId: gatepass.student_id,
      targetName: gatepass.student_name,
      languageHint: gatepass.late_return?.call_language || '',
    });
  };

  const playWardenNote = async (gatepassId, languageHint) => {
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
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Users size={24} /> Students
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Review late leave returns, hear the latest warden note, and run portal call follow-ups from one place.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <SummaryCard label="Late Returns" value={stats.total} color="#ef4444" />
        <SummaryCard label="Awaiting Review" value={stats.awaitingReview} color="#f59e0b" />
        <SummaryCard label="Portal Calls Due" value={stats.callDue} color="#3b82f6" />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Loader2 className="spin" />
        </div>
      ) : lateArrivals.length === 0 ? (
        <div className="card" style={{ padding: 28, color: 'var(--text-muted)' }}>
          No late leave returns are waiting right now.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {lateArrivals.map((gatepass) => {
            const reviewDraft = reviewDrafts[gatepass._id] || {};
            const callDraft = callDrafts[gatepass._id] || {};

            return (
              <div key={gatepass._id} className="card" style={{ padding: 18, display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                      {gatepass.student_name} ({gatepass.register_number})
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      {gatepass.destination} • Returned at {formatDateTime(gatepass.actual_return)} • Expected by {formatDateTime(gatepass.expected_return)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      QR ID: {gatepass.qr_code_id || 'Legacy QR'} • Call status: {gatepass.late_return?.call_status || 'not_required'}
                    </div>
                  </div>
                  <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Late Leave
                  </span>
                </div>

                <div style={studentMessageCardStyle}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Student message</div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    {gatepass.late_return?.excuse_text || 'No late-arrival message was submitted within the one-hour window.'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Message window: until {formatDateTime(gatepass.late_return_window_deadline)}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
                  <div style={panelStyle}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Warden message</div>
                    <select
                      className="input"
                      value={reviewDraft.decision || gatepass.late_return?.warden_decision || 'meet_warden'}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [gatepass._id]: { ...current[gatepass._id], decision: event.target.value },
                        }))
                      }
                    >
                      {DECISION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Message shown to the student and the security scanner..."
                      value={reviewDraft.message ?? gatepass.late_return?.warden_message ?? ''}
                      onChange={(event) =>
                        setReviewDrafts((current) => ({
                          ...current,
                          [gatepass._id]: { ...current[gatepass._id], message: event.target.value },
                        }))
                      }
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => playWardenNote(gatepass._id, gatepass.late_return?.call_language)}>
                        <Volume2 size={16} /> Listen
                      </button>
                      <button className="btn btn-primary" style={{ flex: 1 }} disabled={!!updatingId} onClick={() => submitLateReview(gatepass._id)}>
                        <Send size={16} /> Save
                      </button>
                    </div>
                  </div>

                  <div style={panelStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Portal call follow-up</div>
                      <span className="badge">{gatepass.late_return?.call_status || 'not_required'}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Due after: {formatDateTime(gatepass.late_return?.follow_up_call_due_at)}
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => startPortalCall(gatepass)}>
                      <Phone size={16} /> Start Portal Call
                    </button>
                    <input
                      className="input"
                      placeholder="Language used in call (Tamil / Hindi / Hinglish / English)"
                      value={callDraft.language ?? gatepass.late_return?.call_language ?? ''}
                      onChange={(event) =>
                        setCallDrafts((current) => ({
                          ...current,
                          [gatepass._id]: { ...current[gatepass._id], language: event.target.value },
                        }))
                      }
                    />
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Manual fallback: paste the call transcript here if Sarvam transcription is not configured yet..."
                      value={callDraft.transcript ?? gatepass.late_return?.call_transcript ?? ''}
                      onChange={(event) =>
                        setCallDrafts((current) => ({
                          ...current,
                          [gatepass._id]: { ...current[gatepass._id], transcript: event.target.value },
                        }))
                      }
                    />
                    {gatepass.late_return?.call_summary && (
                      <div style={{ padding: 10, borderRadius: 8, background: 'rgba(14,165,233,0.12)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                        Summary: {gatepass.late_return.call_summary}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary" style={{ flex: 1 }} disabled={!!updatingId} onClick={() => submitCallOutcome(gatepass._id, true)}>
                        <Phone size={16} /> Call Not Picked
                      </button>
                      <button className="btn btn-primary" style={{ flex: 1 }} disabled={!!updatingId} onClick={() => submitCallOutcome(gatepass._id, false)}>
                        <Send size={16} /> Save Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: 16, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

const studentMessageCardStyle = {
  padding: 12,
  borderRadius: 10,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  display: 'grid',
  gap: 8,
};

const panelStyle = {
  padding: 12,
  borderRadius: 10,
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  display: 'grid',
  gap: 10,
};
