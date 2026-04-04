import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, DoorOpen, MessageSquare, AlertTriangle,
  Building2, Shield, Activity, Zap, Heart, ChevronRight, Clock,
  Loader2, UserCheck, UserX
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    api.get('/analytics/overview')
      .then(res => setData(res.overview || res))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: 'var(--text-muted)' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /> Loading dashboard...
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Students Present',
      value: data?.todayPresent || 0,
      subtitle: `${data?.presentRate || 0}% attendance`,
      icon: UserCheck,
      color: '#10b981',
      route: '/admin/attendance',
    },
    {
      label: 'On Leave',
      value: data?.activeGatepasses || 0,
      subtitle: `${data?.pendingGatepasses || 0} pending`,
      icon: UserX,
      color: '#f59e0b',
      route: '/admin/gatepass',
    },
    {
      label: 'Active Gatepasses',
      value: (data?.activeGatepasses || 0) + (data?.pendingGatepasses || 0),
      subtitle: `${data?.overdueGatepasses || 0} overdue`,
      icon: DoorOpen,
      color: '#3b82f6',
      route: '/admin/gatepass',
    },
    {
      label: 'Active Complaints',
      value: data?.activeComplaints || 0,
      subtitle: `${data?.slaBreaches || 0} SLA breached`,
      icon: MessageSquare,
      color: '#ef4444',
      route: '/admin/complaints',
    },
    {
      label: 'Health Score',
      value: `${data?.healthScore || 98}%`,
      subtitle: 'Hostel wellbeing index',
      icon: Heart,
      color: '#8b5cf6',
      route: null,
    },
  ];

  const quickActions = [
    { label: 'Hostel Info', icon: Building2, route: '/admin/hostel-info', desc: 'Floor plans & rooms' },
    { label: 'View Complaints', icon: MessageSquare, route: '/admin/complaints', desc: 'Active issues' },
    { label: 'Manage Gatepass', icon: DoorOpen, route: '/admin/gatepass', desc: 'Approve / reject' },
    ...(['warden', 'hostel_admin'].includes(user?.role)
      ? [{ label: 'Students', icon: Users, route: '/admin/students', desc: 'Late returns & portal calls' }]
      : []),
    { label: 'Emergency Alerts', icon: AlertTriangle, route: '/admin/health', desc: 'Health events', danger: true },
  ];

  const alertItems = [
    data?.overdueGatepasses > 0 && {
      type: 'danger',
      title: `${data.overdueGatepasses} Overdue Gatepass${data.overdueGatepasses > 1 ? 'es' : ''}`,
      desc: 'Students exceeding return limits',
      icon: Clock,
    },
    data?.slaBreaches > 0 && {
      type: 'warning',
      title: `${data.slaBreaches} SLA Breach${data.slaBreaches > 1 ? 'es' : ''}`,
      desc: 'Complaints past resolution deadline',
      icon: AlertTriangle,
    },
    data?.openEmergencies > 0 && {
      type: 'danger',
      title: `${data.openEmergencies} Health Alert${data.openEmergencies > 1 ? 's' : ''}`,
      desc: 'Unresolved health events',
      icon: Heart,
    },
    data?.vacantRooms > 0 && {
      type: 'info',
      title: `${data.vacantRooms} Vacant Room${data.vacantRooms > 1 ? 's' : ''}`,
      desc: 'Available for allocation',
      icon: Building2,
    },
  ].filter(Boolean);

  const alertColors = {
    danger: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444', text: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.08)', border: '#f59e0b', text: '#f59e0b' },
    info: { bg: 'rgba(59,130,246,0.08)', border: '#3b82f6', text: '#3b82f6' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{
            fontSize: '1.75rem', fontWeight: 900,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <LayoutDashboard size={26} /> Hostel Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Real-time overview · VHOSTELCC Operations
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px',
          background: 'rgba(99,102,241,0.1)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}>
          <Activity size={14} color="#6366f1" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#818cf8' }}>Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="kpi-card"
              onClick={() => card.route && navigate(card.route)}
              style={{ cursor: card.route ? 'pointer' : 'default' }}
            >
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                background: card.color, opacity: 0.6,
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${card.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.color,
                }}>
                  <Icon size={18} />
                </div>
                {card.route && <ChevronRight size={14} color="var(--text-muted)" />}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 6 }}>
                {card.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {card.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom row: Quick Actions + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Quick Actions */}
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="#6366f1" /> Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.label}
                  className="card"
                  onClick={() => navigate(action.route)}
                  style={{
                    padding: '18px 16px',
                    cursor: 'pointer',
                    transition: 'all 250ms ease',
                    borderLeft: action.danger ? '3px solid #ef4444' : '3px solid transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--border-accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = action.danger ? '#ef4444' : 'var(--border)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Icon size={18} color={action.danger ? '#ef4444' : '#6366f1'} />
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{action.label}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Required / Alerts */}
        <div>
          <h3 style={{
            fontWeight: 700, fontSize: '1rem', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 8,
            color: alertItems.length > 0 ? '#ef4444' : 'var(--text-primary)',
          }}>
            <AlertTriangle size={18} /> Action Required
            {alertItems.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 4 }}>{alertItems.length}</span>
            )}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alertItems.length === 0 ? (
              <div className="card" style={{
                padding: 32, textAlign: 'center', color: 'var(--text-muted)',
                fontSize: '0.875rem',
              }}>
                <Shield size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div>All systems operational</div>
              </div>
            ) : (
              alertItems.map((alert, i) => {
                const colors = alertColors[alert.type];
                const Icon = alert.icon;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '14px 16px',
                      background: colors.bg,
                      borderLeft: `3px solid ${colors.border}`,
                      borderRadius: `0 var(--radius-md) var(--radius-md) 0`,
                      animation: `fadeInUp 0.3s ease ${i * 0.08}s both`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Icon size={16} color={colors.text} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: colors.text }}>
                          {alert.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {alert.desc}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
