import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useAlertStore } from '../store/authStore';
import {
  LayoutDashboard, User, MessageSquare, DoorOpen, ClipboardCheck,
  UtensilsCrossed, WashingMachine, Users, Bell, LogOut, Menu, X,
  Building2, Shield, ChevronRight, Zap, Heart, Megaphone, Calendar,
  UserCog, QrCode, Hash, Activity
} from 'lucide-react';
import ChatBot from '../components/ChatBot/ChatBot.jsx';


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
  { to: '/student/laundry', icon: WashingMachine, label: 'Laundry' },
  { to: '/student/guest', icon: Users, label: 'Guest Request' },
  { divider: true, label: 'Social' },
  { to: '/student/community', icon: Hash, label: 'Community' },
];

const adminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { divider: true, label: 'Core Modules' },
  { to: '/admin/rooms', icon: Building2, label: 'Room Allocation' },
  { to: '/admin/complaints', icon: MessageSquare, label: 'Complaints' },
  { to: '/admin/gatepass', icon: DoorOpen, label: 'Gatepass' },
  { to: '/admin/attendance', icon: ClipboardCheck, label: 'Attendance' },
  { divider: true, label: 'Management' },
  { to: '/admin/health', icon: Heart, label: 'Health Events' },
  { to: '/admin/mess', icon: UtensilsCrossed, label: 'Mess Management' },
  { to: '/admin/staff', icon: UserCog, label: 'Staff Directory' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { divider: true, label: 'Intelligence' },
  { to: '/admin/community', icon: Activity, label: 'Community Sentiment' },
];

const guardNav = [
  { to: '/guard/scan', icon: QrCode, label: 'Gate Scanner' },
];

const dhobiNav = [
  { to: '/dhobi/scan', icon: WashingMachine, label: 'Laundry Scanner' },
];

const navByRole = { student: studentNav, admin: adminNav, guard: guardNav, dhobi: dhobiNav };

export default function AppShell({ role }) {
  const { user, logout } = useAuthStore();
  const alerts = useAlertStore((s) => s.alerts);
  const removeAlert = useAlertStore((s) => s.removeAlert);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const navItems = navByRole[role] || studentNav;
  const unresolvedAlerts = alerts.length;

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
              background: 'var(--grad-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>SmartHostel</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI Platform</div>
            </div>
          </div>
        </div>

        {/* User pill */}
        <div style={{ margin: '12px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {user?.role?.replace('_', ' ').toUpperCase()} {user?.block_name ? `· ${user.block_name}` : ''}
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
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }} onClick={handleLogout}>
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

            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Page content */}
        <Outlet />
      </div>

      {/* AI Chatbot — student only */}
      {role === 'student' && <ChatBot />}
    </div>
  );
}
