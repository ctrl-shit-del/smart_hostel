import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { label: 'Student', register_number: '23BCE1001', password: 'Student@123', role: 'student', color: '#6366f1' },
  { label: 'Warden', register_number: 'WARDEN01', password: 'Warden@123', role: 'warden', color: '#10b981' },
  { label: 'Admin', register_number: 'ADMIN01', password: 'Admin@123', role: 'hostel_admin', color: '#f59e0b' },
  { label: 'Guard', register_number: 'GUARD01', password: 'Guard@123', role: 'guard', color: '#06b6d4' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ register_number: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.register_number || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.user, res.token);
      toast.success(`Welcome back, ${res.user.name}!`);
      // Route based on role
      const role = res.user.role;
      if (role === 'student') navigate('/student/dashboard');
      else if (role === 'guard') navigate('/guard/scan');
      else navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setForm({ register_number: account.register_number, password: account.password });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(6,182,212,0.04) 100%)',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: 500, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-brand)',
            }}>
              <Shield size={24} color="white" />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>SmartHostel AI</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VIT Chennai | Solve-A-Thon 2026</div>
            </div>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: 12, lineHeight: 1.1 }}>
            Intelligent Hostel<br />
            <span style={{ background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Operations Platform
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '1rem', lineHeight: 1.7 }}>
            Automate operations, predict issues, improve student safety — for 8,000 students across 4 hostels.
          </p>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { val: '8,000+', label: 'Students' },
              { val: '4', label: 'Hostels' },
              { val: '15', label: 'Modules' },
            ].map((s) => (
              <div key={s.label} style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, background: 'var(--grad-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.val}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div style={{
        width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
        flexShrink: 0,
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28 }}>Sign in to your hostel portal</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Register Number / ID</label>
              <input
                className="input"
                placeholder="e.g. 23BCE1753"
                value={form.register_number}
                onChange={(e) => setForm({ ...form, register_number: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10, textAlign: 'center' }}>
              — Demo Accounts —
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => fillDemo(acc)}
                  className="btn btn-secondary btn-sm"
                  style={{ borderLeft: `3px solid ${acc.color}`, justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{acc.label}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>{acc.register_number}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            SmartHostel AI · PS-002 · Solve-A-Thon 2026
          </p>
        </div>
      </div>
    </div>
  );
}
