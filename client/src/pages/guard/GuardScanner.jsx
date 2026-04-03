import React, { useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function GuardScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState('exit');
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 10 }, false);
    scanner.render(
      (decoded) => { handleScan(decoded); },
      (err) => {}
    );
    scannerRef.current = scanner;
    return () => { scanner.clear().catch(() => {}); };
  }, [scanType]);

  const handleScan = async (token) => {
    if (loading) return;
    setLoading(true);
    try {
      const endpoint = scanType === 'exit' ? '/gatepass/scan/exit' : '/gatepass/scan/entry';
      const res = await api.post(endpoint, { qr_token: token });
      setScanResult({ ...res, token });
      if (res.status === 'GREEN') toast.success('✅ Valid — Entry allowed');
      else if (res.status === 'YELLOW') toast('⚠️ Pass expiring soon', { icon: '⚠️' });
      else toast.error('🚫 Access denied or expired');
    } catch (err) {
      setScanResult({ status: 'RED', message: err.message || 'Scan failed' });
      toast.error('Scan failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleManual = (e) => {
    e.preventDefault();
    if (!manualToken) return;
    handleScan(manualToken);
    setManualToken('');
  };

  const statusStyles = {
    GREEN: { bg: 'rgba(16,185,129,0.1)', border: '#10b981', icon: <CheckCircle size={48} color="#10b981" />, label: 'ACCESS GRANTED' },
    YELLOW: { bg: 'rgba(245,158,11,0.1)', border: '#f59e0b', icon: <AlertCircle size={48} color="#f59e0b" />, label: 'EXPIRING SOON' },
    RED: { bg: 'rgba(239,68,68,0.1)', border: '#ef4444', icon: <XCircle size={48} color="#ef4444" />, label: 'ACCESS DENIED' },
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div className="page-header">
        <h1>Gate Scanner</h1>
        <p>Scan student QR passes at entry/exit · Guard Interface</p>
      </div>

      {/* Scan type toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['exit', 'entry'].map((t) => (
          <button key={t} onClick={() => { setScanType(t); setScanResult(null); }}
            className={`btn ${scanType === t ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, fontSize: '1rem', padding: '12px' }}>
            {t === 'exit' ? '🚶‍♂️ Exit Scan' : '🔙 Return Scan'}
          </button>
        ))}
      </div>

      {/* Scan result display */}
      {scanResult && (
        <div style={{ padding: 28, borderRadius: 'var(--radius-lg)', background: statusStyles[scanResult.status]?.bg || 'var(--bg-card)', border: `2px solid ${statusStyles[scanResult.status]?.border || '#666'}`, marginBottom: 20, textAlign: 'center' }}>
          {statusStyles[scanResult.status]?.icon}
          <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: 12, color: statusStyles[scanResult.status]?.border }}>
            {statusStyles[scanResult.status]?.label || 'UNKNOWN'}
          </div>
          {scanResult.gatepass && (
            <div style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{scanResult.gatepass.student_name}</div>
              <div>{scanResult.gatepass.register_number}</div>
              <div>Destination: {scanResult.gatepass.destination}</div>
              <div>Expected return: {scanResult.gatepass.expected_return ? new Date(scanResult.gatepass.expected_return).toLocaleString('en-IN') : '—'}</div>
            </div>
          )}
          {scanResult.message && <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.8rem' }}>{scanResult.message}</div>}
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setScanResult(null)}>Scan Next</button>
        </div>
      )}

      {/* QR scanner */}
      {!scanResult && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <QrCode size={14} /> Point camera at student's QR code
          </div>
          <div id="reader" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }} />
        </div>
      )}

      {/* Manual token input */}
      <form onSubmit={handleManual} className="glass-card" style={{ padding: 16, display: 'flex', gap: 10 }}>
        <input className="input" placeholder="Or paste QR token manually..." value={manualToken} onChange={(e) => setManualToken(e.target.value)} style={{ flex: 1 }} />
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? '...' : 'Scan'}</button>
      </form>
    </div>
  );
}
