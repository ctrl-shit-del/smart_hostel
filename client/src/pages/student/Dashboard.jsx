import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import {
  AlertTriangle, UtensilsCrossed, WashingMachine, DoorOpen,
  MessageSquare, Bell, ClipboardCheck, ChevronRight, Wifi, Heart
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState({ menu: [], laundry: null, complaints: [], gatepass: [], announcements: [] });
  const [loading, setLoading] = useState(true);
  const [sosModal, setSosModal] = useState(false);
  const [sosSeverity, setSosSeverity] = useState('');
  const [sosLoading, setSosLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [menuRes, laundryRes, complaintsRes, gatepassRes, announcementsRes] = await Promise.allSettled([
        api.get('/mess/menu'),
        api.get('/laundry/schedule/me'),
        api.get('/complaints?limit=3'),
        api.get('/gatepass?limit=3'),
        api.get('/announcements'),
      ]);
      setData({
        menu: menuRes.value?.menu || [],
        laundry: laundryRes.value || null,
        complaints: complaintsRes.value?.complaints || [],
        gatepass: gatepassRes.value?.gatepasses || [],
        announcements: announcementsRes.value?.announcements || [],
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async () => {
    if (!sosSeverity) { toast.error('Select severity'); return; }
    setSosLoading(true);
    try {
      await api.post('/health/sos', { severity: sosSeverity, description: 'Student triggered SOS from dashboard' });
      toast.success('🚨 Emergency alert sent! Help is on the way.');
      setSosModal(false);
    } catch (err) {
      toast.error('Failed to send SOS');
    } finally {
      setSosLoading(false);
    }
  };

  const quickActions = [
    { label: 'Raise Complaint', icon: MessageSquare, color: '#6366f1', path: '/student/complaint/new' },
    { label: 'Apply Gatepass', icon: DoorOpen, color: '#10b981', path: '/student/gatepass/apply' },
    { label: 'View Mess', icon: UtensilsCrossed, color: '#f59e0b', path: '/student/mess' },
    { label: 'Laundry', icon: WashingMachine, color: '#06b6d4', path: '/student/laundry' },
  ];

  const statusColor = { Open: 'badge-warning', 'In Progress': 'badge-info', Resolved: 'badge-success', Closed: 'badge-muted', Urgent: 'badge-danger' };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Room {user?.room_no || '—'} · Floor {user?.floor_no || '—'} · {user?.block_name || 'A Block'} · {user?.register_number}</p>
      </div>

      {/* SOS Button — always visible */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="sos-btn" onClick={() => setSosModal(true)}>
          🚨 SOS Emergency
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>One tap sends alert to warden & health center</span>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="glass-card"
              style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: 'none', cursor: 'pointer', textAlign: 'center' }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${action.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${action.color}44` }}>
                <Icon size={18} color={action.color} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{action.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Today's Mess */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}><UtensilsCrossed size={16} color="#f59e0b" /> Today's Mess</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/mess')}>View all</button>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 80 }} />
          ) : data.menu.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Menu not available</div>
          ) : (
            data.menu.slice(0, 3).map((item, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.meal}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.items?.map(i => i.name).join(', ') || 'Check mess board'}</div>
              </div>
            ))
          )}
        </div>

        {/* Laundry Schedule */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}><WashingMachine size={16} color="#06b6d4" /> Laundry</h3>
          {loading ? <div className="skeleton" style={{ height: 80 }} /> : data.laundry ? (
            <>
              {data.laundry.chota_dhobi && (
                <div style={{ padding: '8px 10px', background: 'rgba(6,182,212,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 8, border: '1px solid rgba(6,182,212,0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 600 }}>Chota Dhobi (Free)</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>{data.laundry.chota_dhobi.day}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{data.laundry.chota_dhobi.time}</div>
                </div>
              )}
              {data.laundry.profab && (
                <div style={{ padding: '8px 10px', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>Profab (Paid)</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 2 }}>Pickup: {data.laundry.profab.day}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{data.laundry.profab.pickup} · Delivery: {data.laundry.profab.delivery}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Schedule not available</div>
          )}
        </div>

        {/* Recent Complaints */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={16} color="#6366f1" /> My Complaints</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/student/complaints')}>View all</button>
          </div>
          {loading ? <div className="skeleton" style={{ height: 80 }} /> : data.complaints.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No complaints raised</div>
          ) : (
            data.complaints.map((c) => (
              <div key={c._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.category}</div>
                </div>
                <span className={`badge ${statusColor[c.status] || 'badge-muted'}`}>{c.status}</span>
              </div>
            ))
          )}
        </div>

        {/* Announcements */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}><Bell size={16} color="#f59e0b" /> Announcements</h3>
          {loading ? <div className="skeleton" style={{ height: 80 }} /> : data.announcements.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No announcements</div>
          ) : (
            data.announcements.slice(0, 3).map((a) => (
              <div key={a._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{a.content?.substring(0, 80)}{a.content?.length > 80 ? '...' : ''}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SOS Modal */}
      {sosModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={20} />Emergency SOS</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
              Select severity. Warden will be alerted immediately. Critical alerts also notify health center + parents.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {['Minor', 'Moderate', 'Critical'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSosSeverity(sev)}
                  style={{
                    padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    border: `2px solid ${sosSeverity === sev ? (sev === 'Critical' ? '#ef4444' : sev === 'Moderate' ? '#f59e0b' : '#10b981') : 'var(--border)'}`,
                    background: sosSeverity === sev ? `rgba(${sev === 'Critical' ? '239,68,68' : sev === 'Moderate' ? '245,158,11' : '16,185,129'},0.1)` : 'var(--bg-elevated)',
                    color: 'var(--text-primary)', fontWeight: 600,
                  }}
                >
                  {sev === 'Minor' ? '🩹' : sev === 'Moderate' ? '🏥' : '🚨'} {sev}
                  <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)', marginTop: 2 }}>
                    {sev === 'Minor' ? 'Self-care guidance' : sev === 'Moderate' ? 'Health center visit' : 'Ambulance + emergency contacts'}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSosModal(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 2 }} onClick={handleSOS} disabled={sosLoading}>
                {sosLoading ? 'Sending...' : '🚨 Send Emergency Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
