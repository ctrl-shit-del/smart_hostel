import React, { useState, useEffect } from 'react';
import { QrCode, LogOut, LogIn, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function GuardScanner() {
  const [mode, setMode] = useState('exit'); // 'exit' or 'entry'
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { success, data, message }

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(onScanSuccess, onScanFailure);

      function onScanSuccess(decodedText) {
        scanner.clear();
        setScanning(false);
        handleScan(decodedText);
      }
      function onScanFailure() { /* ignore continuous failures */ }

      return () => scanner.clear().catch(e => console.error(e));
    }
  }, [scanning, mode]);

  const handleScan = async (token) => {
    try {
      const endpoint = mode === 'exit' ? '/gatepass/scan/exit' : '/gatepass/scan/entry';
      const res = await api.post(endpoint, { token });
      setResult({ success: true, data: res.gatepass, message: res.message });
      toast.success(res.message);
    } catch (err) {
      setResult({ success: false, message: err.message || 'Invalid QR' });
      // We play an error sound or show big red UI
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}><QrCode size={24} style={{verticalAlign: -4}}/> Guard Scanner</h1>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={`btn ${mode === 'exit' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('exit'); setResult(null); }}>
          <LogOut size={18}/> SCAN EXIT
        </button>
        <button className={`btn ${mode === 'entry' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('entry'); setResult(null); }}>
          <LogIn size={18}/> SCAN ENTRY
        </button>
      </div>

      {/* Scanner Box */}
      <div className="card" style={{ padding: 20, minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!scanning && !result && (
          <button className="btn btn-primary btn-lg" onClick={() => setScanning(true)}>Start Camera</button>
        )}

        {scanning && <div id="reader" style={{ width: '100%', maxWidth: 400 }} />}

        {result && (
          <div style={{ padding: 20, width: '100%' }}>
            {result.success ? (
              <div style={{ color: '#10b981' }}>
                <CheckCircle2 size={64} style={{ margin: '0 auto 12px' }} />
                <h2 style={{ fontWeight: 800 }}>SUCCESS ({mode.toUpperCase()})</h2>
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-primary)', textAlign: 'left' }}>
                  <b>Student:</b> {result.data.student_name} ({result.data.register_number})<br/>
                  <b>Room:</b> {result.data.room_no}<br/>
                  <b>Destination:</b> {result.data.destination}<br/>
                  <b>Return Due:</b> {new Date(result.data.expected_return).toLocaleString()}<br/>
                  <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>{result.message}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#ef4444' }}>
                <XCircle size={64} style={{ margin: '0 auto 12px' }} />
                <h2 style={{ fontWeight: 800 }}>INVALID QR</h2>
                <div style={{ marginTop: 12, padding: 12, background: '#ef444420', borderRadius: 8 }}>
                  {result.message}
                </div>
              </div>
            )}
            <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setResult(null)}>Scan Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
