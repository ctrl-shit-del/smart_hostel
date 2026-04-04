import React, { useEffect, useRef, useState } from 'react';
import { Phone, PhoneIncoming, PhoneOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../lib/api';
import { getSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/authStore';
import { usePortalCallStore } from '../../store/callStore';

const CALL_EVENTS = {
  INCOMING: 'portal_call:incoming',
  ACCEPTED: 'portal_call:accepted',
  DECLINED: 'portal_call:declined',
  SIGNAL: 'portal_call:signal',
  ENDED: 'portal_call:ended',
};

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
const WARDEN_ROLES = ['warden', 'hostel_admin'];

const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: false,
};

const getSupportedRecorderMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
  if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) return 'audio/ogg;codecs=opus';
  return '';
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default function PortalCallCenter() {
  const user = useAuthStore((state) => state.user);
  const outgoingRequest = usePortalCallStore((state) => state.outgoingRequest);
  const incomingCall = usePortalCallStore((state) => state.incomingCall);
  const activeCall = usePortalCallStore((state) => state.activeCall);
  const clearOutgoingRequest = usePortalCallStore((state) => state.clearOutgoingRequest);
  const setIncomingCall = usePortalCallStore((state) => state.setIncomingCall);
  const clearIncomingCall = usePortalCallStore((state) => state.clearIncomingCall);
  const setActiveCall = usePortalCallStore((state) => state.setActiveCall);
  const patchActiveCall = usePortalCallStore((state) => state.patchActiveCall);
  const clearActiveCall = usePortalCallStore((state) => state.clearActiveCall);
  const markCallUpdated = usePortalCallStore((state) => state.markCallUpdated);

  const activeCallRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaRecorderChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const mediaDestinationRef = useRef(null);
  const socketCleanupRef = useRef(null);
  const ringTimeoutRef = useRef(null);

  const [connecting, setConnecting] = useState(false);
  const isWardenSide = WARDEN_ROLES.includes(user?.role);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
  }, [activeCall]);

  const getMicrophoneStream = async () => navigator.mediaDevices.getUserMedia(audioConstraints);

  const cleanupMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    mediaDestinationRef.current = null;
  };

  const stopRecorder = async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    return new Promise((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = mediaRecorderChunksRef.current.length
          ? new Blob(mediaRecorderChunksRef.current, { type: mimeType })
          : null;

        mediaRecorderRef.current = null;
        mediaRecorderChunksRef.current = [];
        resolve(blob);
      };
      recorder.stop();
    });
  };

  const startRecorderIfNeeded = () => {
    if (!isWardenSide || mediaRecorderRef.current || !localStreamRef.current || !remoteStreamRef.current) {
      return;
    }

    const mimeType = getSupportedRecorderMimeType();
    if (!mimeType) return;

    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();
    const localSource = audioContext.createMediaStreamSource(localStreamRef.current);
    const remoteSource = audioContext.createMediaStreamSource(remoteStreamRef.current);

    localSource.connect(destination);
    remoteSource.connect(destination);

    const recorder = new MediaRecorder(destination.stream, { mimeType });
    mediaRecorderChunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) {
        mediaRecorderChunksRef.current.push(event.data);
      }
    };
    recorder.start(1000);

    audioContextRef.current = audioContext;
    mediaDestinationRef.current = destination;
    mediaRecorderRef.current = recorder;
  };

  const uploadCallRecording = async (currentCall, recordingBlob, endReason = 'completed') => {
    if (!currentCall?.gatepassId) return;

    if (endReason === 'not_picked' || endReason === 'declined') {
      try {
        await api.post(`/gatepass/${currentCall.gatepassId}/late-call`, {
          not_picked: true,
          session_id: currentCall.sessionId,
          started_at: currentCall.startedAt,
          ended_at: new Date().toISOString(),
          not_picked_reason:
            endReason === 'declined'
              ? 'Student declined the portal call.'
              : 'Student did not pick up the portal call.',
        });
        markCallUpdated();
      } catch (error) {
        toast.error(error.message || 'Could not save the missed portal call.');
      }
      return;
    }

    if (!recordingBlob) return;

    try {
      const audioBase64 = await blobToDataUrl(recordingBlob);
      await api.post(`/gatepass/${currentCall.gatepassId}/late-call`, {
        audio_base64: audioBase64,
        audio_mime_type: recordingBlob.type,
        session_id: currentCall.sessionId,
        started_at: currentCall.startedAt,
        ended_at: new Date().toISOString(),
        language: currentCall.languageHint || '',
      });
      toast.success('Call summary saved to the student record.');
      markCallUpdated();
    } catch (error) {
      toast.error(
        error.message || 'Portal call ended, but the automatic transcript could not be saved yet.'
      );
    }
  };

  const finishCall = async ({ emitEnd = true, endReason = 'ended' } = {}) => {
    const currentCall = activeCallRef.current;
    if (!currentCall) return;

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    if (emitEnd) {
      getSocket()?.emit(CALL_EVENTS.ENDED, {
        sessionId: currentCall.sessionId,
        reason: endReason,
      });
    }

    const recordingBlob = await stopRecorder();
    cleanupMedia();
    clearActiveCall();
    clearIncomingCall();
    setConnecting(false);

    if (isWardenSide) {
      await uploadCallRecording(currentCall, recordingBlob, endReason);
    }
  };

  const createPeerConnection = (targetUserId, sessionId) => {
    const socket = getSocket();
    const peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket?.emit(CALL_EVENTS.SIGNAL, {
        sessionId,
        toUserId: targetUserId,
        candidate: event.candidate,
      });
    };

    peerConnection.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
      }
      patchActiveCall({ status: 'connected' });
      startRecorderIfNeeded();
    };

    peerConnection.onconnectionstatechange = () => {
      const nextState = peerConnection.connectionState;
      if (nextState === 'connected') {
        patchActiveCall({ status: 'connected' });
        startRecorderIfNeeded();
      } else if (['failed', 'disconnected', 'closed'].includes(nextState)) {
        finishCall({ emitEnd: false, endReason: nextState === 'failed' ? 'disconnected' : 'ended' });
      }
    };

    localStreamRef.current?.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const beginOutgoingCall = async (request) => {
    const socket = getSocket();
    if (!socket) {
      toast.error('Call service is still connecting. Please try again in a moment.');
      clearOutgoingRequest();
      return;
    }

    if (activeCallRef.current) {
      toast.error('Finish the current call before starting another one.');
      clearOutgoingRequest();
      return;
    }

    try {
      setConnecting(true);
      localStreamRef.current = await getMicrophoneStream();
      const sessionId = `late-${request.gatepassId}-${Date.now()}`;
      createPeerConnection(request.toUserId, sessionId);

      setActiveCall({
        sessionId,
        gatepassId: request.gatepassId,
        peerUserId: request.toUserId,
        peerName: request.targetName || 'Student',
        direction: 'outgoing',
        status: 'ringing',
        startedAt: new Date().toISOString(),
        languageHint: request.languageHint || '',
      });

      socket.emit(CALL_EVENTS.INCOMING, {
        sessionId,
        gatepassId: request.gatepassId,
        toUserId: request.toUserId,
        callerName: user?.name || 'Warden',
        callerRole: user?.role || 'warden',
      });
    } catch (_error) {
      cleanupMedia();
      clearActiveCall();
      toast.error('Microphone access is required for portal calls.');
    } finally {
      clearOutgoingRequest();
      setConnecting(false);
    }
  };

  const acceptIncomingCall = async () => {
    const call = incomingCall;
    if (!call) return;

    try {
      setConnecting(true);
      localStreamRef.current = await getMicrophoneStream();
      createPeerConnection(call.fromUserId, call.sessionId);
      setActiveCall({
        sessionId: call.sessionId,
        gatepassId: call.gatepassId,
        peerUserId: call.fromUserId,
        peerName: call.fromName || 'Warden',
        direction: 'incoming',
        status: 'connecting',
        startedAt: new Date().toISOString(),
        languageHint: call.languageHint || '',
      });

      getSocket()?.emit(CALL_EVENTS.ACCEPTED, {
        sessionId: call.sessionId,
      });
    } catch (_error) {
      cleanupMedia();
      clearActiveCall();
      toast.error('Microphone access is required to answer the portal call.');
    } finally {
      clearIncomingCall();
      setConnecting(false);
    }
  };

  const declineIncomingCall = async () => {
    if (!incomingCall) return;

    getSocket()?.emit(CALL_EVENTS.DECLINED, {
      sessionId: incomingCall.sessionId,
      reason: 'declined',
    });
    clearIncomingCall();
  };

  useEffect(() => {
    if (!outgoingRequest) return;
    beginOutgoingCall(outgoingRequest);
  }, [outgoingRequest]);

  useEffect(() => {
    const attachSocketHandlers = () => {
      const socket = getSocket();
      if (!socket) return null;

      const handleIncoming = (payload) => {
        if (activeCallRef.current) return;
        setIncomingCall(payload);
      };

      const handleAccepted = async (payload) => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.sessionId !== payload.sessionId) return;

        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit(CALL_EVENTS.SIGNAL, {
          sessionId: currentCall.sessionId,
          toUserId: currentCall.peerUserId,
          description: offer,
        });
        patchActiveCall({ status: 'connecting' });
      };

      const handleSignal = async (payload) => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.sessionId !== payload.sessionId) return;

        const peerConnection = peerConnectionRef.current;
        if (!peerConnection) return;

        if (payload.description) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.description));

          if (payload.description.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit(CALL_EVENTS.SIGNAL, {
              sessionId: currentCall.sessionId,
              toUserId: currentCall.peerUserId,
              description: answer,
            });
          }
        }

        if (payload.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
        }
      };

      const handleDeclined = (payload) => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.sessionId !== payload.sessionId) return;
        toast.error('The student did not take the portal call.');
        finishCall({ emitEnd: false, endReason: payload.reason === 'declined' ? 'declined' : 'not_picked' });
      };

      const handleEnded = (payload) => {
        const currentCall = activeCallRef.current;
        if (!currentCall || currentCall.sessionId !== payload.sessionId) return;
        finishCall({ emitEnd: false, endReason: payload.reason || 'ended' });
      };

      socket.on(CALL_EVENTS.INCOMING, handleIncoming);
      socket.on(CALL_EVENTS.ACCEPTED, handleAccepted);
      socket.on(CALL_EVENTS.SIGNAL, handleSignal);
      socket.on(CALL_EVENTS.DECLINED, handleDeclined);
      socket.on(CALL_EVENTS.ENDED, handleEnded);

      return () => {
        socket.off(CALL_EVENTS.INCOMING, handleIncoming);
        socket.off(CALL_EVENTS.ACCEPTED, handleAccepted);
        socket.off(CALL_EVENTS.SIGNAL, handleSignal);
        socket.off(CALL_EVENTS.DECLINED, handleDeclined);
        socket.off(CALL_EVENTS.ENDED, handleEnded);
      };
    };

    const cleanup = attachSocketHandlers();
    if (cleanup) {
      socketCleanupRef.current = cleanup;
      return cleanup;
    }

    const timer = window.setInterval(() => {
      const nextCleanup = attachSocketHandlers();
      if (nextCleanup) {
        socketCleanupRef.current = nextCleanup;
        window.clearInterval(timer);
      }
    }, 400);

    return () => {
      window.clearInterval(timer);
      socketCleanupRef.current?.();
      socketCleanupRef.current = null;
    };
  }, [patchActiveCall, setIncomingCall, clearIncomingCall]);

  useEffect(() => {
    const currentCall = activeCall;
    if (!currentCall || currentCall.direction !== 'outgoing' || currentCall.status !== 'ringing') {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
      return;
    }

    ringTimeoutRef.current = window.setTimeout(() => {
      toast.error('The student did not pick up the portal call.');
      finishCall({ emitEnd: true, endReason: 'not_picked' });
    }, 30000);

    return () => {
      if (ringTimeoutRef.current) {
        clearTimeout(ringTimeoutRef.current);
        ringTimeoutRef.current = null;
      }
    };
  }, [activeCall]);

  useEffect(() => () => {
    cleanupMedia();
    socketCleanupRef.current?.();
  }, []);

  const startManualCall = (payload) => requestOutgoingCall(payload);
  void startManualCall;

  if (!['student', 'warden', 'hostel_admin', 'floor_admin'].includes(user?.role)) {
    return null;
  }

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay />

      {incomingCall && !activeCall && (
        <div style={incomingOverlayStyle}>
          <div className="card" style={incomingCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={ringIconStyle}>
                <PhoneIncoming size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800 }}>Portal call incoming</div>
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  {incomingCall.fromName || 'Warden'} is calling about a late-return leave.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={declineIncomingCall} disabled={connecting}>
                <PhoneOff size={16} /> Decline
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={acceptIncomingCall} disabled={connecting}>
                {connecting ? <Loader2 size={16} className="spin" /> : <Phone size={16} />}
                Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {activeCall && (
        <div className="card" style={floatingCallStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>
                {activeCall.direction === 'outgoing' ? 'Calling' : 'Portal call'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {activeCall.peerName} • {activeCall.status}
              </div>
            </div>
            <div style={callStatusDot(activeCall.status)} />
          </div>

          <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {activeCall.status === 'connected'
              ? 'The call is live. When you hang up, the recording will be saved back to the late-return case.'
              : 'Stay on this page while the portal connects the call.'}
          </div>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 14, width: '100%', justifyContent: 'center', background: 'rgba(239,68,68,0.18)', color: '#fecaca' }}
            onClick={() => finishCall({ emitEnd: true, endReason: activeCall.status === 'ringing' ? 'not_picked' : 'ended' })}
          >
            <PhoneOff size={16} /> End Call
          </button>
        </div>
      )}
    </>
  );
}

const incomingOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(3,7,18,0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 220,
  padding: 20,
};

const incomingCardStyle = {
  width: 'min(420px, 100%)',
  padding: 20,
};

const ringIconStyle = {
  width: 42,
  height: 42,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(99,102,241,0.18)',
  color: '#c4b5fd',
};

const floatingCallStyle = {
  position: 'fixed',
  right: 24,
  bottom: 24,
  width: 'min(360px, calc(100vw - 32px))',
  padding: 16,
  zIndex: 180,
  boxShadow: '0 20px 50px rgba(15,23,42,0.45)',
};

const callStatusDot = (status) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  background:
    status === 'connected'
      ? '#10b981'
      : status === 'ringing'
        ? '#f59e0b'
        : '#3b82f6',
  boxShadow: '0 0 0 6px rgba(255,255,255,0.04)',
});
