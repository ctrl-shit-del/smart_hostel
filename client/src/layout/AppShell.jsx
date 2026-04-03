import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../store/authStore';
import {
  LayoutDashboard, User, MessageSquare, DoorOpen, ClipboardCheck,
  UtensilsCrossed, WashingMachine, Users, Bell, LogOut, Menu, X,
  Building2, Shield, ChevronRight, Zap, Heart, Megaphone, Calendar,
<<<<<<< HEAD
  UserCog, QrCode, Hash, Activity, MoonStar
=======
  UserCog, QrCode, Hash, Activity
>>>>>>> abeb5f8 (chore: solve merge conflicts and stage community features)
} from 'lucide-react';
import ChatBot from '../components/ChatBot/ChatBot.jsx';
import PortalCallCenter from '../components/calls/PortalCallCenter.jsx';

// ─── Role-based Theme ────────────────────────────────────────────────────────
const ROLE_THEME = {
  student: {
    accent: '#06b6d4',       // cyan
    gradient: 'linear-gradient(135deg, #0e7490 0%, #06b6d4 100%)',
    glow: 'rgba(6,182,212,0.25)',
    badge: 'STUDENT',
  },
  admin: {
    accent: '#8b5cf6',       // violet
    gradient: 'linear-gradient(135deg, #5b21b6 0%, #8b5cf6 100%)',
    glow: 'rgba(139,92,246,0.25)',
    badge: 'STAFF',
  },
  proctor: {
    accent: '#0f766e',
    gradient: 'linear-gradient(135deg, #115e59 0%, #14b8a6 100%)',
    glow: 'rgba(20,184,166,0.24)',
    badge: 'PROCTOR',
  },
  guard: {
    accent: '#f59e0b',       // amber
    gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)',
    glow: 'rgba(245,158,11,0.25)',
    badge: 'SECURITY',
  },
  security: {
    accent: '#f97316',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #fb923c 100%)',
    glow: 'rgba(249,115,22,0.25)',
    badge: 'SECURITY',
  },
  dhobi: {
    accent: '#10b981',       // emerald
    gradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
    glow: 'rgba(16,185,129,0.25)',
    badge: 'SERVICE',
  },
};

// ─── Nav Items ────────────────────────────────────────────────────────────────
const studentNav = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/profile', icon: User, label: 'My Profile' },
  { divider: true, label: 'Services' },
  { to: '/student/complaint/new', icon: MessageSquare, label: 'Raise Complaint' },
  { to: '/student/complaints', icon: ClipboardCheck, label: 'My Complaints' },
  { to: '/student/gatepass/apply', icon: DoorOpen, label: 'Apply Gatepass' },
  { to: '/student/gatepass', icon: ClipboardCheck, label: 'My Gatepasses' },
  { to: '/student/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { divider: true, label: 'Hostel Info' },
  { to: '/student/mess', icon: UtensilsCrossed, label: 'Mess Menu' },
  { to: '/student/night-mess', icon: MoonStar, label: 'Night Mess' },
  { to: '/student/laundry', icon: WashingMachine, label: 'Laundry' },
  { to: '/student/guest', icon: Users, label: 'Guest Request' },
  { divider: true, label: 'Social' },
  { to: '/student/community', icon: Hash, label: 'Community' },
];

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { divider: true, label: 'Core Modules' },
  { to: '/admin/hostel-info', icon: Building2, label: 'Hostel Info' },
  { to: '/admin/rooms', icon: Building2, label: 'Room Allocation' },
  { to: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/admin/gatepass', icon: DoorOpen, label: 'Gatepass' },
  { to: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { divider: true, label: 'Management' },
  { to: '/admin/health', icon: Heart, label: 'Health Events' },
  { to: '/admin/mess', icon: UtensilsCrossed, label: 'Mess Management' },
  { to: '/admin/staff', icon: UserCog, label: 'Staff Directory' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
<<<<<<< HEAD
  { divider: true, label: 'Services' },
  { to: '/admin/students', icon: Users, label: 'Students' },
=======
>>>>>>> abeb5f8 (chore: solve merge conflicts and stage community features)
  { divider: true, label: 'Intelligence' },
  { to: '/admin/community', icon: Activity, label: 'Community Sentiment' },
];

const guardNav = [
  { to: '/guard/scan', icon: QrCode, label: 'Gate Scanner' },
];

const proctorNav = [
  { to: '/proctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { divider: true, label: 'Approvals' },
  { to: '/proctor/gatepass', icon: DoorOpen, label: 'Leave Requests' },
];

const securityNav = [
  { to: '/security/scan', icon: QrCode, label: 'QR Scanner' },
];

const dhobiNav = [
  { to: '/dhobi/scan', icon: WashingMachine, label: 'Laundry Scanner' },
];

const navByRole = { student: studentNav, admin: adminNav, proctor: proctorNav, guard: guardNav, security: securityNav, dhobi: dhobiNav };

export default function AppShell({ role }) {
  const { user, logout } = useAuthStore();
  const alerts = useAlertStore((s) => s.alerts);
  const removeAlert = useAlertStore((s) => s.removeAlert);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const canSeeStudents = ['warden', 'hostel_admin'].includes(user?.role);
  const navItems = role === 'admin'
    ? adminNav.filter((item) => canSeeStudents || (item.to !== '/admin/students' && item.label !== 'Services'))
    : navByRole[role] || studentNav;
  const unresolvedAlerts = alerts.length;
  const theme = ROLE_THEME[role] || ROLE_THEME.admin;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: theme.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 16px ${theme.glow}`,
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>VHOSTELCC</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Smart Operations</div>
            </div>
          </div>
        </div>

        {/* User pill */}
        <div style={{
          margin: '12px',
          padding: '10px 12px',
          background: `${theme.accent}11`,
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${theme.accent}33`,
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.name}
          </div>
          <div style={{
            fontSize: '0.68rem', marginTop: 4,
            display: 'inline-block',
            padding: '2px 8px',
            background: `${theme.accent}22`,
            color: theme.accent,
            borderRadius: 20,
            fontWeight: 700,
            letterSpacing: '0.07em',
          }}>
            {theme.badge} {user?.block_name ? `· ${user.block_name}` : ''}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {navItems.map((item, i) => {
            if (item.divider) {
              return <div key={i} className="nav-section-title">{item.label}</div>;
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => isActive ? { '--nav-active-color': theme.accent } : {}}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }} />
      )}

      {/* Main content */}
      <div className="main-content" style={{ minHeight: '100vh' }}>
        {/* Topbar */}
        <div className="topbar" style={{ marginBottom: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }}>
            <Menu size={20} />
          </button>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Role indicator chip */}
            <div style={{
              padding: '4px 12px', borderRadius: 20,
              background: `${theme.accent}18`,
              border: `1px solid ${theme.accent}44`,
              color: theme.accent,
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em',
            }}>
              {theme.badge}
            </div>

            {/* Alert bell */}
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setAlertsOpen(!alertsOpen)}>
                <Bell size={18} />
                {unresolvedAlerts > 0 && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4, width: 8, height: 8,
                    background: '#ef4444', borderRadius: '50%',
                  }} />
                )}
              </button>
              {alertsOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 44, width: 340,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                  zIndex: 200, overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.875rem' }}>
                    Live Alerts {unresolvedAlerts > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{unresolvedAlerts}</span>}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                    {alerts.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No alerts</div>
                    ) : alerts.map((alert) => (
                      <div key={alert.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: alert.type === 'danger' ? '#ef4444' : alert.type === 'warning' ? '#f59e0b' : alert.type === 'success' ? '#10b981' : '#3b82f6' }}>{alert.title}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{alert.message}</div>
                        </div>
                        <button onClick={() => removeAlert(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: theme.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 700, color: 'white',
              boxShadow: `0 0 10px ${theme.glow}`,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <Outlet />
      </div>

      <PortalCallCenter />

      {/* AI Chatbot — student only */}
      {role === 'student' && <ChatBot />}
    </div>
  );
}
