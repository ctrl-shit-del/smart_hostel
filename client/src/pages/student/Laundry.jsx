import React, { useEffect, useState } from 'react';
import { ShoppingBag, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';

export default function LaundrySchedule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState('');
  const socket = useSocket();

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

  useEffect(() => {
    if (!socket) return;
    
    const handleAccepted = (payload) => {
      toast.success(payload.message, { duration: 5000 });
      fetchStatus();
    };
    
    const handleReady = (payload) => {
      toast.success(payload.message, { duration: 8000, icon: '🎉' });
      fetchStatus();
    };

    const handleOutOfSchedule = (payload) => {
      toast.error(payload.message, { duration: 10000, icon: '❌' });
    };

    socket.on('laundry:accepted', handleAccepted);
    socket.on('laundry:ready', handleReady);
    socket.on('laundry:out_of_schedule', handleOutOfSchedule);

    return () => {
      socket.off('laundry:accepted', handleAccepted);
      socket.off('laundry:ready', handleReady);
      socket.off('laundry:out_of_schedule', handleOutOfSchedule);
    };
  }, [socket]);

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  const isProcessing = data?.active_session?.status === 'Processing';
  const isReady = data?.active_session?.status === 'Ready';

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

      {isReady ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', borderLeft: '4px solid #10b981' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Ready for Pickup!</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Your laundry has been washed, pressed, and is ready to be collected from the Dhobi bay.
          </p>
        </div>
      ) : (
        data?.is_laundry_day && (
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', borderLeft: `4px solid ${isProcessing ? '#3b82f6' : '#8b5cf6'}` }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
              {isProcessing ? 'Laundry Processing' : 'Bag Drop-off QR'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
              {isProcessing 
                ? 'Your laundry is currently being cleaned.' 
                : 'Show this QR code to the Dhobi staff to drop off your bag.'}
            </p>
            
            <div style={{ background: 'white', padding: 16, borderRadius: 16, display: 'inline-block', marginBottom: 24 }}>
              {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 200, height: 200 }} /> : <span className="spin" style={{ width: 24, height: 24, border: '3px solid #ccc', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>}
            </div>

            {isProcessing ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', padding: '12px 24px', borderRadius: 99 }}>
                <span className="spin" style={{ width: 12, height: 12, border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}></span>
                <span style={{ color: '#3b82f6', fontWeight: 600 }}>Status: Expected Today</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(139,92,246,0.1)', padding: '12px 24px', borderRadius: 99 }}>
                <ShoppingBag size={16} color="#8b5cf6" />
                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>Waiting for Dhobi Scan...</span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
