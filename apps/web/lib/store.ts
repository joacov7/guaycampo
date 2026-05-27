import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { QueuePositionWithDetails, QueueMetrics } from '@/types';

// -----------------------------------------------------------------------------
// Auth Store (complementa next-auth, persiste datos del tenant)
// -----------------------------------------------------------------------------

interface AuthStore {
  tenantSlug: string | null;
  tenantName: string | null;
  userRole: string | null;
  userId: string | null;
  setTenant: (slug: string, name: string) => void;
  setUser: (id: string, role: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tenantSlug: null,
      tenantName: null,
      userRole: null,
      userId: null,
      setTenant: (slug, name) => set({ tenantSlug: slug, tenantName: name }),
      setUser: (id, role) => set({ userId: id, userRole: role }),
      clearAuth: () =>
        set({
          tenantSlug: null,
          tenantName: null,
          userRole: null,
          userId: null,
        }),
    }),
    {
      name: 'guaycampo-auth',
    },
  ),
);

// -----------------------------------------------------------------------------
// Queue Store (actualizado por WebSocket en tiempo real)
// -----------------------------------------------------------------------------

interface QueueStore {
  positions: QueuePositionWithDetails[];
  metrics: QueueMetrics | null;
  isConnected: boolean;
  lastUpdated: Date | null;
  setPositions: (positions: QueuePositionWithDetails[]) => void;
  updatePosition: (position: QueuePositionWithDetails) => void;
  removePosition: (truckShiftId: string) => void;
  setMetrics: (metrics: QueueMetrics) => void;
  setConnected: (connected: boolean) => void;
}

export const useQueueStore = create<QueueStore>()((set) => ({
  positions: [],
  metrics: null,
  isConnected: false,
  lastUpdated: null,
  setPositions: (positions) => set({ positions, lastUpdated: new Date() }),
  updatePosition: (position) =>
    set((state) => {
      const idx = state.positions.findIndex(
        (p) => p.truckShiftId === position.truckShiftId,
      );
      if (idx >= 0) {
        const updated = [...state.positions];
        updated[idx] = position;
        return { positions: updated, lastUpdated: new Date() };
      }
      return {
        positions: [...state.positions, position],
        lastUpdated: new Date(),
      };
    }),
  removePosition: (truckShiftId) =>
    set((state) => ({
      positions: state.positions.filter(
        (p) => p.truckShiftId !== truckShiftId,
      ),
      lastUpdated: new Date(),
    })),
  setMetrics: (metrics) => set({ metrics }),
  setConnected: (connected) => set({ isConnected: connected }),
}));

// -----------------------------------------------------------------------------
// UI Store
// -----------------------------------------------------------------------------

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'guaycampo-ui',
    },
  ),
);
