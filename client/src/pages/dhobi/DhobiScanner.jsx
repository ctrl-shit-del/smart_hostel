import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ShoppingBag, Send, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const MODES = {
  RECEIVE: 'receive',
  SEND: 'send',
};

export default function DhobiScanner() {
  const [mode, setMode] = useState(MODES.RECEIVE);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const isProcessingRef = useRef(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    // Destroy and re-mount scanner whenever mode changes
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 5,
    }, false);

    scanner.render(
      (decodedText) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        handleScan(decodedText);
      },
      () => { /* ignore decode errors */ }
    );

    scannerRef.current = scanner;
    return () => { scanner.clear().catch(() => {}); };
  }, [mode]);

  const handleScan = async (qr_token) => {
    setLoading(true);
    const endpoint = mode === MODES.RECEIVE ? '/laundry/scan/receive' : '/laundry/scan/send';
    try {
      const res = await api.post(endpoint, { qr_token });
      setScanResult({ success: true, message: res.message });
      toast.success(res.message);
    } catch (err) {
      const msg = err.message || 'Scan failed';
      setScanResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setScanResult(null);
        isProcessingRef.current = false;
      }, 3500);
    }
  };

  const isReceive = mode === MODES.RECEIVE;

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '16px 20px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ background: isReceive ? '#8b5cf6' : '#10b981', padding: 12, borderRadius: '50%', transition: 'background 0.3s' }}>
          {isReceive ? <ShoppingBag color="white" size={22} /> : <Send color="white" size={22} />}
        </div>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dhobi Scanner</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {isReceive ? 'Receive student bag & start processing' : 'Mark cleaned clothes ready for pickup'}
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--bg-elevated)', padding: 6, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => { setScanResult(null); setMode(MODES.RECEIVE); }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
            background: isReceive ? '#8b5cf6' : 'transparent',
            color: isReceive ? 'white' : 'var(--text-muted)',
          }}
        >
          📥 Receive Bag
        </button>
        <button
          onClick={() => { setScanResult(null); setMode(MODES.SEND); }}
          style={{
            flex: 1, padding: '10px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
            background: !isReceive ? '#10b981' : 'transparent',
            color: !isReceive ? 'white' : 'var(--text-muted)',
          }}
        >
          📤 Send Back
        </button>
      </div>

      {/* Info Banner */}
      <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: '0.82rem', fontWeight: 600,
        background: isReceive ? 'rgba(139,92,246,0.1)' : 'rgba(16,185,129,0.1)',
        color: isReceive ? '#8b5cf6' : '#10b981',
        border: `1px solid ${isReceive ? 'rgba(139,92,246,0.3)' : 'rgba(16,185,129,0.3)'}`,
      }}>
        {isReceive
          ? '📋 Verifies laundry day. Creates a Processing session. Notifies student.'
          : '📋 Requires an existing Processing session. Marks Ready. Notifies student.'}
      </div>

      {/* Scanner */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: 36, height: 36, border: '4px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}
        <div id="reader" />
      </div>

      {/* Result */}
      {scanResult && (
        <div className="animate-fade-in" style={{
          marginTop: 16, padding: '20px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)',
          background: scanResult.success ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${scanResult.success ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        }}>
          {scanResult.success
            ? <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 10px' }} />
            : <XCircle size={44} color="#ef4444" style={{ margin: '0 auto 10px' }} />}
          <p style={{ fontWeight: 700, fontSize: '1rem', color: scanResult.success ? '#10b981' : '#ef4444' }}>
            {scanResult.message}
          </p>
        </div>
      )}
    </div>
  );
}
