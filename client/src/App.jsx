import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useSocket } from './hooks/useSocket';

// Pages
import LoginPage from './pages/LoginPage';
import AppShell from './layout/AppShell';
import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import RaiseComplaint from './pages/student/RaiseComplaint';
import MyComplaints from './pages/student/MyComplaints';
import ApplyGatepass from './pages/student/ApplyGatepass';
import MyGatepass from './pages/student/MyGatepass';
import MyAttendance from './pages/student/Attendance';
import MessInfo from './pages/student/Mess';
import NightMess from './pages/student/NightMess';
import LaundrySchedule from './pages/student/Laundry';
import GuestRequest from './pages/student/GuestRequest';
import CommunityForum from './pages/student/Community';
<<<<<<< HEAD
=======
import ChatbotWidget from './pages/student/ChatbotWidget';
>>>>>>> abeb5f8 (chore: solve merge conflicts and stage community features)

import AdminDashboard from './pages/admin/Dashboard';
import RoomAllocation from './pages/admin/RoomAllocation';
import ComplaintDashboard from './pages/admin/ComplaintDashboard';
import AttendanceView from './pages/admin/AttendanceView';
import GatepassManagement from './pages/admin/GatepassManagement';
import HealthEvents from './pages/admin/HealthEvents';
import StaffDirectory from './pages/admin/StaffDirectory';
import Announcements from './pages/admin/Announcements';
import MessManagement from './pages/admin/MessManagement';
import CommunitySentiment from './pages/admin/CommunitySentiment';
<<<<<<< HEAD
import HostelInfo from './pages/admin/HostelInfo';
import StudentsDesk from './pages/admin/StudentsDesk';
import ProctorDashboard from './pages/proctor/Dashboard';
=======
>>>>>>> abeb5f8 (chore: solve merge conflicts and stage community features)

import GuardScanner from './pages/guard/GuardScanner';
import DhobiScanner from './pages/dhobi/DhobiScanner';
import SecurityScanner from './pages/security/SecurityScanner';

import './index.css';

// Socket connection (once, at root)
function SocketInit() {
  useSocket();
  return null;
}

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRouter() {
  const { user } = useAuthStore();
  const role = user?.role;
  if (role === 'proctor') {
    return <Navigate to="/proctor/dashboard" replace />;
  }
  if (role === 'hostel_admin' || role === 'warden' || role === 'floor_admin' || role === 'mess_incharge') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (role === 'guard') return <Navigate to="/guard/scan" replace />;
  if (role === 'security_incharge') return <Navigate to="/security/scan" replace />;
  if (role === 'housekeeping') return <Navigate to="/dhobi/scan" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <BrowserRouter>
      {isAuthenticated && <SocketInit />}
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#16161f', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.07)' },
          success: { iconTheme: { primary: '#10b981', secondary: '#16161f' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#16161f' } },
        }}
      />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={<ProtectedRoute><RoleRouter /></ProtectedRoute>} />

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><AppShell role="student" /></ProtectedRoute>}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="complaint/new" element={<RaiseComplaint />} />
          <Route path="complaints" element={<MyComplaints />} />
          <Route path="gatepass/apply" element={<ApplyGatepass />} />
          <Route path="gatepass" element={<MyGatepass />} />
          <Route path="attendance" element={<MyAttendance />} />
          <Route path="mess" element={<MessInfo />} />
          <Route path="night-mess" element={<NightMess />} />
          <Route path="laundry" element={<LaundrySchedule />} />
          <Route path="guest" element={<GuestRequest />} />
          <Route path="community" element={<CommunityForum />} />
        </Route>

        {/* Admin/Warden/Staff Routes */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['hostel_admin', 'warden', 'floor_admin', 'mess_incharge', 'housekeeping', 'technician']}><AppShell role="admin" /></ProtectedRoute>}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="hostel-info" element={<HostelInfo />} />
          <Route path="rooms" element={<RoomAllocation />} />
          <Route path="complaints" element={<ComplaintDashboard />} />
          <Route path="attendance" element={<AttendanceView />} />
          <Route path="gatepass" element={<GatepassManagement />} />
          <Route path="health" element={<HealthEvents />} />
          <Route path="staff" element={<StaffDirectory />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="mess" element={<MessManagement />} />
<<<<<<< HEAD
          <Route path="students" element={<ProtectedRoute allowedRoles={['hostel_admin', 'warden']}><StudentsDesk /></ProtectedRoute>} />
          <Route path="community" element={<CommunitySentiment />} />
        </Route>

        <Route path="/proctor" element={<ProtectedRoute allowedRoles={['proctor', 'hostel_admin']}><AppShell role="proctor" /></ProtectedRoute>}>
          <Route path="dashboard" element={<ProctorDashboard />} />
          <Route path="gatepass" element={<GatepassManagement />} />
=======
          <Route path="community" element={<CommunitySentiment />} />
>>>>>>> abeb5f8 (chore: solve merge conflicts and stage community features)
        </Route>

        {/* Guard Routes */}
        <Route path="/guard" element={<ProtectedRoute allowedRoles={['guard']}><AppShell role="guard" /></ProtectedRoute>}>
          <Route path="scan" element={<GuardScanner />} />
        </Route>

        <Route path="/security" element={<ProtectedRoute allowedRoles={['security_incharge']}><AppShell role="security" /></ProtectedRoute>}>
          <Route path="scan" element={<SecurityScanner />} />
        </Route>

        {/* Dhobi / Housekeeping Routes */}
        <Route path="/dhobi" element={<ProtectedRoute allowedRoles={['housekeeping', 'hostel_admin']}><AppShell role="dhobi" /></ProtectedRoute>}>
          <Route path="scan" element={<DhobiScanner />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {isAuthenticated && <ChatbotWidget />}
    </BrowserRouter>
  );
}
