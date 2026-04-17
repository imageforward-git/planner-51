import { create } from "zustand";

interface AppState {
  currentWorkspaceId: string | null;
  sidebarOpen: boolean;
  setCurrentWorkspace: (id: string) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentWorkspaceId: null,
  sidebarOpen: true,
  setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
