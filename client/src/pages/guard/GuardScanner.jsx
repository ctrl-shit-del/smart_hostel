import React, { useEffect, useState } from 'react';
import { CheckCircle2, LogIn, LogOut, QrCode, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import toast from 'react-hot-toast';

import api from '../../lib/api';

export default function GuardScanner({ title = 'Guard Scanner' }) {
  const [mode, setMode] = useState('exit');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [scanLog, setScanLog] = useState([]);

  useEffect(() => {
    if (!scanning) return undefined;

    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(onScanSuccess, onScanFailure);

    function onScanSuccess(decodedText) {
      scanner.clear();
      setScanning(false);
      handleScan(decodedText);
    }

    function onScanFailure() {}

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [scanning, mode]);

  const handleScan = async (token) => {
    try {
      const endpoint = mode === 'exit' ? '/gatepass/scan/exit' : '/gatepass/scan/entry';
      const response = await api.post(endpoint, { code: token });
      setResult({ success: true, data: response.gatepass, message: response.message });
      setScanLog((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          mode,
          success: true,
          student_name: response.gatepass?.student_name,
          register_number: response.gatepass?.register_number,
          message: response.message,
          scanned_at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 8));
      toast.success(response.message);
    } catch (error) {
      setResult({ success: false, message: error.message || 'Invalid QR code.', details: error });
      setScanLog((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          mode,
          success: false,
          student_name: error.student_name,
          register_number: error.register_number,
          message: error.message || 'Invalid QR code.',
          scanned_at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 8));
      toast.error(error.message || 'Invalid QR code.');
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 20 }}>
        <QrCode size={24} style={{ verticalAlign: -4 }} /> {title}
      </h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={`btn ${mode === 'exit' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('exit'); setResult(null); }}>
          <LogOut size={18} /> Scan Exit
        </button>
        <button className={`btn ${mode === 'entry' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1 }} onClick={() => { setMode('entry'); setResult(null); }}>
          <LogIn size={18} /> Scan Entry
        </button>
      </div>

      <div className="card" style={{ padding: 20, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!scanning && !result && (
          <button className="btn btn-primary btn-lg" onClick={() => setScanning(true)}>
            Start Camera
          </button>
        )}

        {scanning && <div id="reader" style={{ width: '100%', maxWidth: 420 }} />}

        {result && (
          <div style={{ padding: 20, width: '100%' }}>
            {result.success ? (
              <div style={{ color: '#10b981' }}>
                <CheckCircle2 size={64} style={{ margin: '0 auto 12px' }} />
                <h2 style={{ fontWeight: 800 }}>Success ({mode.toUpperCase()})</h2>
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-elevated)', borderRadius: 8, color: 'var(--text-primary)', textAlign: 'left', display: 'grid', gap: 4 }}>
                  <div><strong>Student:</strong> {result.data.student_name} ({result.data.register_number})</div>
                  <div><strong>Room:</strong> {result.data.room_no}</div>
                  <div><strong>Destination:</strong> {result.data.destination}</div>
                  <div><strong>QR ID:</strong> {result.data.qr_code_id || 'Legacy QR'}</div>
                  <div><strong>Return Due:</strong> {new Date(result.data.expected_return).toLocaleString()}</div>
                  {typeof result.data.outing_flag_count === 'number' && (
                    <div><strong>Outing Flags:</strong> {result.data.outing_flag_count}</div>
                  )}
                  {result.data.security_message && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Security Note:</strong> {result.data.security_message}
                    </div>
                  )}
                  <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>{result.message}</div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#ef4444' }}>
                <XCircle size={64} style={{ margin: '0 auto 12px' }} />
                <h2 style={{ fontWeight: 800 }}>Invalid QR</h2>
                <div style={{ marginTop: 12, padding: 12, background: '#ef444420', borderRadius: 8, textAlign: 'left' }}>
                  <div>{result.message}</div>
                  {result.details?.register_number && (
                    <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                      <strong>Register Number:</strong> {result.details.register_number}
                    </div>
                  )}
                  {typeof result.details?.flag_count === 'number' && (
                    <div style={{ marginTop: 4, fontSize: '0.85rem' }}>
                      <strong>Flag Count:</strong> {result.details.flag_count}
                    </div>
                  )}
                  {result.details?.credentials_locked && (
                    <div style={{ marginTop: 4, fontSize: '0.85rem', fontWeight: 700 }}>
                      Credentials locked. Send student to hostel office.
                    </div>
                  )}
                </div>
              </div>
            )}
            <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={() => setResult(null)}>
              Scan Next
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 20, padding: 16, textAlign: 'left' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12 }}>Recent Scan Log</h3>
        {scanLog.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No scans recorded in this session yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {scanLog.map((log) => (
              <div key={log.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <strong>{log.student_name || log.register_number || 'Unknown QR'}</strong>
                  <span style={{ color: log.success ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                    {log.success ? 'Logged' : 'Blocked'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {log.mode.toUpperCase()} • {new Date(log.scanned_at).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.84rem', marginTop: 6 }}>{log.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
