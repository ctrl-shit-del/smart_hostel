import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useAlertStore } from '../store/authStore';

let socket = null;

export const getSocket = () => socket;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const addAlert = useAlertStore((state) => state.addAlert);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    socket = io('/', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => console.log('Socket connected'));
    socket.on('disconnect', () => console.log('Socket disconnected'));

    socket.on('complaint:new', (data) =>
      addAlert({ type: 'warning', title: 'New Complaint', message: data.complaint?.title })
    );
    socket.on('complaint:escalated', (data) =>
      addAlert({ type: 'danger', title: 'SLA Breached', message: data.message })
    );
    socket.on('health:sos', (data) =>
      addAlert({ type: 'danger', title: `SOS - ${data.severity}`, message: `${data.student_name} | ${data.room}` })
    );
    socket.on('gatepass:overdue', (data) =>
      addAlert({ type: 'warning', title: 'Overdue Gatepass', message: `${data.student_name} not returned` })
    );
    socket.on('alert:new', (data) =>
      addAlert({ type: 'info', title: data.title, message: data.content })
    );
    socket.on('gatepass:approved', () =>
      addAlert({ type: 'success', title: 'Gatepass Approved', message: 'Your gatepass has been approved by the proctor.' })
    );
    socket.on('gatepass:rejected', (data) =>
      addAlert({ type: 'danger', title: 'Gatepass Rejected', message: data.reason })
    );
    socket.on('gatepass:late_return_updated', (data) => {
      const updateType = data?.type;
      const title = updateType === 'late_return_reviewed'
        ? 'Late Return Reviewed'
        : updateType === 'late_return_call_saved'
          ? 'Late Return Call Saved'
          : 'Late Return Update';

      addAlert({
        type: 'info',
        title,
        message: `${data?.student_name || 'Student'} late-return record was updated.`,
      });
    });
    socket.on('dashboard:update', (data) => {
      if (data?.type === 'new_gatepass') {
        addAlert({ type: 'info', title: 'New Leave Request', message: `${data?.student_name || 'A student'} submitted a gatepass request.` });
      } else if (data?.type === 'late_return_excuse_submitted') {
        addAlert({ type: 'warning', title: 'Late Return Message', message: 'A student sent a late-return reason.' });
      } else if (data?.type === 'late_return_follow_up_due') {
        addAlert({ type: 'warning', title: 'Portal Call Due', message: 'A late-return follow-up call is now due.' });
      }
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, token, addAlert]);

  return socket;
};

export const useSocketEvent = (event, callback) => {
  useEffect(() => {
    if (!socket) return undefined;

    socket.on(event, callback);
    return () => {
      socket?.off(event, callback);
    };
  }, [event, callback]);
};
