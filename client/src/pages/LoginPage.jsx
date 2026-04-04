import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, Wrench, Eye, EyeOff, Loader2, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import toast from 'react-hot-toast';

const ROLE_CARDS = [
  {
    id: 'student',
    label: 'Student Login',
    subtitle: 'Hostel residents & scholars',
    icon: GraduationCap,
    placeholder: 'Register Number (e.g. 23BCE1753)',
    idLabel: 'Register Number',
    accent: '#06b6d4',    // cyan for students
    glow: 'rgba(6,182,212,0.2)',
  },
  {
    id: 'warden',
    label: 'Warden / Faculty',
    subtitle: 'Hostel administration & staff',
    icon: Shield,
    placeholder: 'Staff ID or Email',
    idLabel: 'Staff ID / Email',
    accent: '#8b5cf6',    // violet for staff
    glow: 'rgba(139,92,246,0.2)',
  },
  {
    id: 'service',
    label: 'Service Providers',
    subtitle: 'Guard, Housekeeping & Others',
    icon: Wrench,
    placeholder: 'Service ID',
    idLabel: 'Service Provider ID',
    accent: '#f59e0b',    // amber for service
    glow: 'rgba(245,158,11,0.2)',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        register_number: form.identifier,
        password: form.password,
        loginCategory: selectedRole.id,
      });
      login(res.user, res.token);
      toast.success(`Welcome, ${res.user.name}!`);
      const role = res.user.role;
      if (role === 'student') navigate('/student/dashboard');
      else if (role === 'guard') navigate('/guard/scan');
      else if (role === 'security_incharge') navigate('/security/scan');
      else if (role === 'housekeeping' || role === 'dhobi') navigate('/dhobi/scan');
      else navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedRole(null);
    setForm({ identifier: '', password: '' });
  };

  const accent = selectedRole?.accent || '#6366f1';
  const glow = selectedRole?.glow || 'rgba(99,102,241,0.15)';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow — changes color based on role */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 700, height: 700,
        background: `radial-gradient(ellipse, ${glow} 0%, transparent 65%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '20%',
        width: 400, height: 400,
        background: `radial-gradient(ellipse, ${glow} 0%, transparent 65%)`,
        pointerEvents: 'none',
        transition: 'background 0.6s ease',
      }} />

      <div style={{
        maxWidth: 520,
        width: '100%',
        padding: '0 24px',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo / Branding */}
        <div style={{ textAlign: 'center', marginBottom: selectedRole ? 28 : 44 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: selectedRole
              ? `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`
              : 'var(--grad-brand)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 40px ${glow}`,
            marginBottom: 16,
            transition: 'all 0.5s ease',
          }}>
            <Shield size={30} color="white" />
          </div>
          <h1 style={{
            fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em',
            color: 'var(--text-primary)', marginBottom: 4,
          }}>
            VHOSTELCC
          </h1>
          <p style={{
            color: 'var(--text-muted)', fontSize: '0.9rem',
            letterSpacing: '0.04em',
          }}>
            Smart Hostel Operations System
          </p>
        </div>

        {/* Role Cards */}
        {!selectedRole && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            animation: 'fadeInUp 0.35s ease both',
          }}>
            {ROLE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedRole(card)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
                    padding: '18px 20px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = card.accent;
                    e.currentTarget.style.boxShadow = `0 0 20px ${card.glow}`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                    background: `linear-gradient(135deg, ${card.accent}33 0%, ${card.accent}22 100%)`,
                    border: `1px solid ${card.accent}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: card.accent,
                  }}>
                    <Icon size={22} />
                  </div>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {card.subtitle}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '1.2rem' }}>›</div>
                </div>
              );
            })}

            <p style={{
              textAlign: 'center', fontSize: '0.7rem',
              color: 'var(--text-muted)', marginTop: 20,
              letterSpacing: '0.04em',
            }}>
              VHOSTELCC · PS-002 · Solve-A-Thon 2026
            </p>
          </div>
        )}

        {/* Login Form */}
        {selectedRole && (
          <div style={{ animation: 'fadeInUp 0.3s ease both' }}>
            {/* Back button */}
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.85rem', marginBottom: 20,
                padding: 0, transition: 'color 200ms ease',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >
              <ChevronLeft size={16} /> Back to role selection
            </button>

            {/* Role banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 18px',
              background: `${selectedRole.accent}11`,
              border: `1px solid ${selectedRole.accent}33`,
              borderRadius: 'var(--radius-md)',
              marginBottom: 24,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: `linear-gradient(135deg, ${selectedRole.accent}44 0%, ${selectedRole.accent}22 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: selectedRole.accent,
              }}>
                <selectedRole.icon size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {selectedRole.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {selectedRole.subtitle}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">{selectedRole.idLabel}</label>
                <input
                  className="input"
                  placeholder={selectedRole.placeholder}
                  value={form.identifier}
                  onChange={(e) => setForm({
                    ...form,
                    identifier: selectedRole.id === 'student'
                      ? e.target.value.toUpperCase()
                      : e.target.value
                  })}
                  autoFocus
                  style={{ '--input-focus-color': selectedRole.accent }}
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
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8, width: '100%',
                  padding: '14px 24px',
                  background: `linear-gradient(135deg, ${selectedRole.accent} 0%, ${selectedRole.accent}cc 100%)`,
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 4px 24px ${selectedRole.glow}`,
                  transition: 'all 0.2s ease',
                }}
              >
                {loading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</>
                ) : (
                  `Sign In to ${selectedRole.label} →`
                )}
              </button>
            </form>

            <p style={{
              marginTop: 24, textAlign: 'center', fontSize: '0.7rem',
              color: 'var(--text-muted)', letterSpacing: '0.04em',
            }}>
              VHOSTELCC · PS-002 · Solve-A-Thon 2026
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
