import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import { User, Building2, Phone, Mail, BookOpen, Bed } from 'lucide-react';

export default function StudentProfile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/profile').then((res) => { setProfile(res.user); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />;

  const p = profile || user;
  return (
    <div className="animate-fade-in">
      <div className="page-header"><h1>My Profile</h1><p>Personal information and room allocation</p></div>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
        {/* Profile card */}
        <div className="glass-card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2rem', fontWeight: 800, color: 'white' }}>
            {p?.name?.charAt(0)}
          </div>
          <h2 style={{ fontSize: '1.1rem' }}>{p?.name}</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: '4px 0 12px' }}>{p?.register_number}</div>
          <span className="badge badge-brand">{p?.role?.replace('_', ' ').toUpperCase()}</span>
          {p?.department && <div style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.department} · Year {p.academic_year}</div>}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}><Building2 size={16} color="#6366f1" /> Room Allocation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                { label: 'Block', val: p?.block_name || '—' },
                { label: 'Floor', val: p?.floor_no ? `Floor ${p.floor_no}` : (p?.floor ? `Floor ${p.floor}` : '—') },
                { label: 'Room Number', val: p?.room_no || '—' },
                { label: 'Bed', val: p?.bed_id ? `Bed ${p.bed_id}` : '—' },
                { label: 'Bed Type', val: p?.bed_type || '—' },
                { label: 'Mess', val: p?.mess_information || '—' },
              ].map(({ label, val }) => (
                <div key={label} style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 16, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={16} color="#10b981" /> Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Phone', val: p?.phone || '—' },
                { label: 'Email', val: p?.email || '—' },
                { label: 'Gender', val: p?.gender || '—' },
                { label: 'Parent Name', val: p?.parent_name || '—' },
                { label: 'Parent Phone', val: p?.parent_phone || '—' },
                { label: 'Parent Email', val: p?.parent_email || '—' },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
