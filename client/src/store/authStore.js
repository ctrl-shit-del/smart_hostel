import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('sh_user') || 'null'),
  token: localStorage.getItem('sh_token') || null,
  isAuthenticated: !!localStorage.getItem('sh_token'),

  login: (user, token) => {
    localStorage.setItem('sh_token', token);
    localStorage.setItem('sh_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('sh_token');
    localStorage.removeItem('sh_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    set((state) => {
      const updated = { ...state.user, ...updates };
      localStorage.setItem('sh_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));

export const useAlertStore = create((set) => ({
  alerts: [],
  addAlert: (alert) => set((state) => ({ alerts: [{ id: Date.now(), ...alert }, ...state.alerts].slice(0, 20) })),
  removeAlert: (id) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),
  clearAlerts: () => set({ alerts: [] }),
}));
