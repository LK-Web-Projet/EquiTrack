'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean
  equipmentFilter: { category_id?: string; status?: string; search: string }
  loansFilter: { status: 'active' | 'returned' | 'all' }
  setSidebarOpen: (open: boolean) => void
  setEquipmentFilter: (f: Partial<UIState['equipmentFilter']>) => void
  setLoansFilter: (f: Partial<UIState['loansFilter']>) => void
}

export const useStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      equipmentFilter: { search: '' },
      loansFilter: { status: 'active' },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setEquipmentFilter: (f) =>
        set((s) => ({ equipmentFilter: { ...s.equipmentFilter, ...f } })),
      setLoansFilter: (f) =>
        set((s) => ({ loansFilter: { ...s.loansFilter, ...f } })),
    }),
    { name: 'equitrack-ui' }
  )
);
