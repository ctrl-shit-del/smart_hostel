import React, { useEffect, useState } from 'react';
import { ShoppingBag, CheckCircle, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';

export default function LaundrySchedule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const fetchStatus = () => {
    api.get('/laundry/status')
      .then(async (res) => { 
        setData(res); 
        if (res.qr_token) {
          try {
            const url = await QRCode.toDataURL(res.qr_token, { width: 200, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
            setQrUrl(url);
          } catch(e) {}
        }
        setLoading(false); 
      })
      .catch((err) => { toast.error(err.message || 'Failed to load schedule'); setLoading(false); });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useSocketEvent('laundry:accepted', (payload) => {
    toast.success(payload.message, { duration: 5000 });
    fetchStatus();
  });

  useSocketEvent('laundry:ready', (payload) => {
    toast.success(payload.message, { duration: 8000, icon: '🎉' });
    fetchStatus();
  });

  const handleRequest = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/laundry/dropoff');
      toast.success('Laundry session started!');
      if (res.qr_token) {
        const url = await QRCode.toDataURL(res.qr_token, { width: 200, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
        setQrUrl(url);
      }
      setData(prev => ({ ...prev, active_session: res.session, qr_token: res.qr_token }));
    } catch (err) {
      toast.error(err.message || 'Failed to request laundry');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <h1>Chota Dhobi</h1>
        <p>Room-Scheduled Laundry Service</p>
      </div>

      {!data?.active_session && !data?.is_laundry_day ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Clock size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Not Your Laundry Day</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Your designated room-scheduled laundry day is <strong style={{ color: 'var(--text-primary)' }}>{data?.laundry_day}</strong>.<br/>
            Today is {data?.current_day}.
          </p>
        </div>
      ) : null}

      {!data?.active_session && data?.is_laundry_day ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <ShoppingBag size={32} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>It's Laundry Day!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            Click below to generate your Drop-off QR code and hand over your laundry bag.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: 16, fontSize: '1.1rem' }} 
            onClick={handleRequest} 
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Request Laundry Drop-off'}
          </button>
        </div>
      ) : null}

      {data?.active_session && (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', borderLeft: `4px solid ${data.active_session.status === 'Ready' ? '#10b981' : '#3b82f6'}` }}>
          {data.active_session.status === 'Ready' ? (
            <>
              <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Ready for Pickup!</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Your laundry has been washed, pressed, and is ready to be collected from the Dhobi bay.
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Drop-off QR Code</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Show this QR code to the Dhobi staff when handing over your bag.</p>
              <div style={{ background: 'white', padding: 16, borderRadius: 16, display: 'inline-block', marginBottom: 24 }}>
                {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 200, height: 200 }} /> : <span className="spin" style={{ width: 24, height: 24, border: '3px solid #ccc', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', padding: '12px 24px', borderRadius: 99 }}>
                <span className="spin" style={{ width: 12, height: 12, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>Status: Processing...</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
