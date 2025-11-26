import { create } from 'zustand';
import { Match } from '../match';

interface StoreState {
  // Matches
  matches: Match[];
  currentMatch: Match | null;
  currentQRExportMatch: Match | null;

  // UI State
  showCreateMatchDialog: boolean;
  showTBADialog: boolean;
  showQRExportDialog: boolean;
  showQRImportDialog: boolean;
  showClearConfirmDialog: boolean;
  showContributorsDialog: boolean;

  // Actions
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (id: string, match: Match) => void;
  deleteMatch: (id: string) => void;
  setCurrentMatch: (match: Match | null) => void;
  setCurrentQRExportMatch: (match: Match | null) => void;

  // UI Actions
  setShowCreateMatchDialog: (show: boolean) => void;
  setShowTBADialog: (show: boolean) => void;
  setShowQRExportDialog: (show: boolean) => void;
  setShowQRImportDialog: (show: boolean) => void;
  setShowClearConfirmDialog: (show: boolean) => void;
  setShowContributorsDialog: (show: boolean) => void;
}

export const useStore = create<StoreState>((set) => ({
  // Initial state
  matches: [],
  currentMatch: null,
  currentQRExportMatch: null,

  showCreateMatchDialog: false,
  showTBADialog: false,
  showQRExportDialog: false,
  showQRImportDialog: false,
  showClearConfirmDialog: false,
  showContributorsDialog: false,

  // Actions
  setMatches: (matches) => set({ matches }),

  addMatch: (match) => set((state) => ({
    matches: [match, ...state.matches]
  })),

  updateMatch: (id, match) => set((state) => ({
    matches: state.matches.map((m) => m.id === id ? match : m)
  })),

  deleteMatch: (id) => set((state) => ({
    matches: state.matches.filter((m) => m.id !== id)
  })),

  setCurrentMatch: (match) => set({ currentMatch: match }),
  setCurrentQRExportMatch: (match) => set({ currentQRExportMatch: match }),

  // UI Actions
  setShowCreateMatchDialog: (show) => set({ showCreateMatchDialog: show }),
  setShowTBADialog: (show) => set({ showTBADialog: show }),
  setShowQRExportDialog: (show) => set({ showQRExportDialog: show }),
  setShowQRImportDialog: (show) => set({ showQRImportDialog: show }),
  setShowClearConfirmDialog: (show) => set({ showClearConfirmDialog: show }),
  setShowContributorsDialog: (show) => set({ showContributorsDialog: show }),
}));
