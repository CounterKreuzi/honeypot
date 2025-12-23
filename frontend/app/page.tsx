'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useBeekeeperStore } from '@/lib/store/beekeeperStore';
import { beekeepersApi } from '@/lib/api/beekeepers';
import { Beekeeper } from '@/types/api';
import BeekeeperCard from '@/components/cards/BeekeeperCard';
import LocationSearch from '@/components/location/LocationSearch';
import MapModal from '@/components/modals/MapModal';
import BeekeeperDetailModal from '@/components/modals/BeekeeperDetailModal';
import { 
  BadgeCheck, 
  Droplets, 
  Loader2, 
  MapPin, 
  Package, 
  List, 
  Map as MapIcon, 
  ChevronDown, 
  FilterX,
  SlidersHorizontal,
  X
} from 'lucide-react';
import Link from 'next/link';

// Dynamischer Import der Karte für SSR Kompatibilität
const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center text-zinc-400">Karte wird geladen...</div>
});

interface Filters {
  honeyTypes: string[];
  bioOnly: boolean;
  maxDistance: number | null;
}

const DEFAULT_FILTERS: Filters = {
  honeyTypes: [],
  bioOnly: false,
  maxDistance: null,
};

interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

// Hilfsfunktion für Distanzberechnung
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function Home() {
  const {
    beekeepers,
    setBeekeepers,
    selectedBeekeeper,
    setSelectedBeekeeper,
    loading,
    setLoading,
    error,
    setError
  } = useBeekeeperStore();

  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Daten laden
  useEffect(() => {
    const fetchBeekeepers = async () => {
      try {
        setLoading(true);
        const data = await beekeepersApi.getAll();
        setBeekeepers(data);
      } catch (err) {
        setError('Imker konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    fetchBeekeepers();
  }, [setBeekeepers, setLoading, setError]);

  const handleLocationChange = (lat: number, lng: number, address: string) => {
    setUserLocation({ latitude: lat, longitude: lng, address });
  };

  const filteredBeekeepers = useMemo(() => {
    return beekeepers
      .map(bk => {
        let distance: number | undefined;
        if (userLocation && bk.latitude && bk.longitude) {
          distance = calculateDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            bk.latitude,
            bk.longitude
          );
        }
        return { ...bk, distance: distance ? Math.round(distance * 10) / 10 : undefined };
      })
      .filter(bk => {
        if (filters.bioOnly && !bk.is_bio) return false;
        if (filters.maxDistance && bk.distance && bk.distance > filters.maxDistance) return false;
        if (filters.honeyTypes.length > 0) {
          const hasType = bk.honey_types?.some(t => filters.honeyTypes.includes(t.name));
          if (!hasType) return false;
        }
        return true;
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [beekeepers, filters, userLocation]);

  const handleCardClick = (bk: Beekeeper) => {
    setSelectedBeekeeper(bk);
    setIsDetailModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-zinc-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-3xl">🍯</span>
            <h1 className="text-xl font-black tracking-tight text-amber-900 hidden sm:block uppercase">
              Honigfinder
            </h1>
          </Link>
          <div className="flex-1 max-w-xl">
            <LocationSearch
              onLocationChange={handleLocationChange}
              currentLocation={userLocation?.address}
            />
          </div>
          <Link 
            href="/login" 
            className="hidden sm:block text-sm font-semibold text-zinc-600 hover:text-amber-600 transition-colors"
          >
            Imker Login
          </Link>
        </div>
      </header>

      {/* Desktop Filter Bar / Mobile Filter Button */}
      <section className="bg-white border-b shadow-sm sticky top-[65px] z-20">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFilterDrawerOpen(true)}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            >
              <SlidersHorizontal size={16} />
              <span>Filter</span>
              {filters.honeyTypes.length + (filters.bioOnly ? 1 : 0) > 0 && (
                <span className="bg-amber-600 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">
                  {filters.honeyTypes.length + (filters.bioOnly ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Schnellfilter Desktop */}
            <div className="hidden md:flex items-center gap-2 border-l pl-4 ml-2">
              <button 
                onClick={() => setFilters(f => ({...f, bioOnly: !f.bioOnly}))}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filters.bioOnly ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white border border-zinc-200 text-zinc-600'}`}
              >
                🌿 Bio-Imker
              </button>
            </div>
          </div>

          <p className="text-sm text-zinc-500 whitespace-nowrap">
            <span className="font-bold text-zinc-900">{filteredBeekeepers.length}</span> Imker gefunden
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-4 lg:py-8">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          
          {/* Main Content: List or Map Toggle (Mobile) */}
          <div className={`${viewMode === 'map' ? 'hidden lg:block' : 'block'}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-amber-600" size={40} />
                <p className="text-zinc-500 font-medium">Bienen werden gerufen...</p>
              </div>
            ) : filteredBeekeepers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredBeekeepers.map((bk) => (
                  <BeekeeperCard 
                    key={bk.id} 
                    beekeeper={bk} 
                    onClick={() => handleCardClick(bk)} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-3xl p-12 text-center">
                <div className="text-4xl mb-4">🐝</div>
                <h3 className="text-xl font-bold text-zinc-900">Keine Imker gefunden</h3>
                <p className="text-zinc-500 mt-2">Versuche es mit anderen Filtern oder einem größeren Umkreis.</p>
                <button 
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-6 text-amber-600 font-bold hover:underline"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            )}
          </div>

          {/* Map Side (Desktop Sticky / Mobile Fullscreen Toggle) */}
          <aside className={`${viewMode === 'list' ? 'hidden lg:block' : 'block'} h-[calc(100vh-180px)] lg:h-[calc(100vh-220px)] lg:sticky lg:top-40`}>
            <div className="h-full w-full rounded-3xl overflow-hidden shadow-xl border border-white relative">
              <BeekeeperMap
                beekeepers={filteredBeekeepers}
                onMarkerClick={handleCardClick}
                userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : undefined}
                isMobile={true} // Aktiviert Mobile-Optimierung in der Map-Komponente
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Floating Toggle Button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => {
            setViewMode(viewMode === 'list' ? 'map' : 'list');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="bg-zinc-900 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm hover:scale-105 active:scale-95 transition-all"
        >
          {viewMode === 'list' ? (
            <><MapIcon size={18} className="text-amber-400" /> Karte anzeigen</>
          ) : (
            <><List size={18} className="text-amber-400" /> Liste anzeigen</>
          )}
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFilterDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Filter</h2>
              <button onClick={() => setIsFilterDrawerOpen(false)} className="p-2 bg-zinc-100 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-bold text-zinc-900 block mb-3 uppercase tracking-wider">Ernährung</label>
                <button 
                  onClick={() => setFilters(f => ({...f, bioOnly: !f.bioOnly}))}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${filters.bioOnly ? 'border-green-500 bg-green-50' : 'border-zinc-100 bg-zinc-50'}`}
                >
                  <span className="font-semibold">🌿 Nur Bio-Imker</span>
                  {filters.bioOnly && <BadgeCheck className="text-green-600" size={20}/>}
                </button>
              </div>

              <div>
                <label className="text-sm font-bold text-zinc-900 block mb-3 uppercase tracking-wider">Umkreis</label>
                <div className="grid grid-cols-3 gap-2">
                  {[10, 25, 50].map(dist => (
                    <button
                      key={dist}
                      onClick={() => setFilters(f => ({...f, maxDistance: f.maxDistance === dist ? null : dist}))}
                      className={`p-3 rounded-xl border-2 text-sm font-bold ${filters.maxDistance === dist ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-zinc-100 text-zinc-500'}`}
                    >
                      {dist} km
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full bg-amber-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-200 mt-4"
              >
                Ergebnisse anzeigen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedBeekeeper && (
        <BeekeeperDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          beekeeper={selectedBeekeeper}
        />
      )}
    </main>
  );
}
