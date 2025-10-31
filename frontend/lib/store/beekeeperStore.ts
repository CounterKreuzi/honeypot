import { create } from 'zustand';
import { Beekeeper } from '@/types/api';

interface BeekeeperState {
  beekeepers: Beekeeper[];
  selectedBeekeeper: Beekeeper | null;
  userLocation: { lat: number; lng: number } | null;
  searchRadius: number;
  loading: boolean;
  error: string | null;
  setBeekeepers: (beekeepers: Beekeeper[]) => void;
  setSelectedBeekeeper: (beekeeper: Beekeeper | null) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setSearchRadius: (radius: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBeekeeperStore = create<BeekeeperState>((set) => ({
  beekeepers: [],
  selectedBeekeeper: null,
  userLocation: null,
  searchRadius: 10,
  loading: false,
  error: null,
  setBeekeepers: (beekeepers) => set({ beekeepers }),
  setSelectedBeekeeper: (beekeeper) => set({ selectedBeekeeper: beekeeper }),
  setUserLocation: (location) => set({ userLocation: location }),
  setSearchRadius: (radius) => set({ searchRadius: radius }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
