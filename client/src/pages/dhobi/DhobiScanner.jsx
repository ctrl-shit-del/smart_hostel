import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Shirt, CheckCircle, XCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function DhobiScanner() {
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { 
      qrbox: { width: 250, height: 250 }, 
      fps: 5 
    }, false);

    scanner.render(
      (decodedText) => {
        scanner.pause(true);
        handleScan(decodedText, scanner);
      },
      (err) => { /* ignore */ }
    );

    return () => { scanner.clear().catch(console.error); };
  }, []);

  const handleScan = async (qr_token, scanner) => {
    setLoading(true);
    try {
      const res = await api.post('/laundry/scan/ready', { qr_token });
      setScanResult({ success: true, message: 'Laundry marked as Ready!', session: res.session });
      toast.success('Successfully scanned');
    } catch (err) {
      setScanResult({ success: false, message: err.message || 'Invalid QR Code' });
      toast.error('Scan Failed');
    } finally {
      setLoading(false);
      setTimeout(() => {
        setScanResult(null);
        scanner.resume();
      }, 3000);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ background: '#3b82f6', padding: 12, borderRadius: '50%' }}>
          <Shirt color="white" size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Dhobi Scanner</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Scan student drop-off QR to mark Ready</p>
        </div>
      </div>

      <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div id="reader"></div>
      </div>

      {scanResult && (
        <div className="animate-fade-in" style={{ 
          marginTop: 16, padding: 24, textAlign: 'center', borderRadius: 'var(--radius-lg)',
          background: scanResult.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${scanResult.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` 
        }}>
          {scanResult.success ? <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 12px' }}/> : <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }}/>}
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: scanResult.success ? '#10b981' : '#ef4444' }}>
            {scanResult.message}
          </h3>
          {scanResult.session && (
            <p style={{ color: 'var(--text-primary)', marginTop: 8 }}>
              Room {scanResult.session.room_no} • {scanResult.session.session_id}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
