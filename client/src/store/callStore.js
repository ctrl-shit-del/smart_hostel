import { create } from 'zustand';

export const usePortalCallStore = create((set) => ({
  outgoingRequest: null,
  incomingCall: null,
  activeCall: null,
  lastCallUpdate: 0,

  requestOutgoingCall: (payload) => set({ outgoingRequest: { ...payload, requestedAt: Date.now() } }),
  clearOutgoingRequest: () => set({ outgoingRequest: null }),

  setIncomingCall: (payload) => set({ incomingCall: payload }),
  clearIncomingCall: () => set({ incomingCall: null }),

  setActiveCall: (payload) => set({ activeCall: payload, incomingCall: null, outgoingRequest: null }),
  patchActiveCall: (updates) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...updates } : null,
    })),
  clearActiveCall: () => set({ activeCall: null }),

  markCallUpdated: () => set({ lastCallUpdate: Date.now() }),
}));
