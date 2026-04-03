import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useAlertStore } from '../store/authStore';

let socket = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const addAlert = useAlertStore((s) => s.addAlert);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => console.log('🔌 Socket connected'));
    socket.on('disconnect', () => console.log('🔌 Socket disconnected'));

    // Global alert events
    socket.on('complaint:new', (data) => addAlert({ type: 'warning', title: 'New Complaint', message: data.complaint?.title }));
    socket.on('complaint:escalated', (data) => addAlert({ type: 'danger', title: 'SLA Breached!', message: data.message }));
    socket.on('health:sos', (data) => addAlert({ type: 'danger', title: `🚨 SOS - ${data.severity}`, message: `${data.student_name} | ${data.room}` }));
    socket.on('gatepass:overdue', (data) => addAlert({ type: 'warning', title: 'Overdue Gatepass', message: `${data.student_name} not returned` }));
    socket.on('alert:new', (data) => addAlert({ type: 'info', title: data.title, message: data.content }));
    socket.on('gatepass:approved', () => addAlert({ type: 'success', title: 'Gatepass Approved', message: 'Your gatepass has been approved!' }));
    socket.on('gatepass:rejected', (data) => addAlert({ type: 'danger', title: 'Gatepass Rejected', message: data.reason }));

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, token]);

  return socket;
};
