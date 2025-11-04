'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useBeekeeperStore } from '@/lib/store/beekeeperStore';
import { beekeepersApi } from '@/lib/api/beekeepers';
import { Beekeeper } from '@/types/api';
import FilterSidebar from '@/components/filters/FilterSidebar';
import BeekeeperCard from '@/components/cards/BeekeeperCard';
import { Loader2, List as ListIcon, Map as MapIcon } from 'lucide-react';

// Dynamic import to avoid SSR issues with Leaflet
const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <p className="text-gray-600">Karte wird geladen...</p>
    </div>
  ),
});

interface Filters {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  hasWebsite: boolean;
  openNow: boolean;
}

export default function Home() {
  const {
    beekeepers,
    setBeekeepers,
    selectedBeekeeper,
    setSelectedBeekeeper,
    loading,
    setLoading,
    setError
  } = useBeekeeperStore();

  const [selectedBeekeeperDetail, setSelectedBeekeeperDetail] = useState<Beekeeper | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'split' | 'map'>('split');
  const [mapHeight, setMapHeight] = useState(50); // vh units: starts at 50vh, shrinks to 25vh
  const [filters, setFilters] = useState<Filters>({
    honeyTypes: [],
    priceRange: [0, 42],
    maxDistance: 50,
    hasWebsite: false,
    openNow: false,
  });

  useEffect(() => {
    loadBeekeepers();
  }, []);

  // Reset map height when changing view mode
  useEffect(() => {
    setMapHeight(50); // Reset to 50vh when switching to split view
  }, [viewMode]);

  // Dynamic map height based on scroll
  useEffect(() => {
    if (viewMode !== 'split') return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = 300; // Pixels to scroll before reaching minimum height

      // Calculate new height: 50vh -> 25vh based on scroll position
      const scrollProgress = Math.min(scrollY / maxScroll, 1); // 0 to 1
      const newHeight = 50 - (scrollProgress * 25); // 50vh to 25vh

      setMapHeight(Math.max(newHeight, 25)); // Minimum 25vh
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode]);

  const loadBeekeepers = async () => {
    try {
      setLoading(true);
      const data = await beekeepersApi.getAll();
      setBeekeepers(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load beekeepers:', error);
      setError('Fehler beim Laden der Imker');
    } finally {
      setLoading(false);
    }
  };

  // Get unique honey types for filters
  const availableHoneyTypes = useMemo(() => {
    const types = new Set<string>();
    beekeepers.forEach((beekeeper) => {
      beekeeper.honeyTypes.forEach((type) => types.add(type.name));
    });
    return Array.from(types);
  }, [beekeepers]);

  // Filter beekeepers based on current filters
  const filteredBeekeepers = useMemo(() => {
    return beekeepers.filter((beekeeper) => {
      // Honey type filter
      if (filters.honeyTypes.length > 0) {
        const hasMatchingType = beekeeper.honeyTypes.some((type) =>
          filters.honeyTypes.includes(type.name)
        );
        if (!hasMatchingType) return false;
      }

      // Price filter
      const prices = beekeeper.honeyTypes.map((type) => type.pricePerJar);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        if (minPrice > filters.priceRange[1]) return false;
      }

      // Distance filter
      if (beekeeper.distance !== undefined) {
        if (beekeeper.distance > filters.maxDistance) return false;
      }

      // Website filter
      if (filters.hasWebsite && !beekeeper.website) {
        return false;
      }

      // Open now filter
      if (filters.openNow && !beekeeper.openingHours) {
        return false;
      }

      return true;
    });
  }, [beekeepers, filters]);

  const handleMarkerClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setSelectedBeekeeperDetail(beekeeper);
  };

  const handleCardClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeperDetail(beekeeper);
    setSelectedBeekeeper(beekeeper);
    // Scroll to top on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-5xl">🍯</span>
              <div>
                <h1 className="text-3xl font-bold">Honeypot</h1>
                <p className="text-amber-100 text-sm">Finde lokale Imker in deiner Nähe</p>
              </div>
            </div>

            {/* View Mode Toggle - Desktop */}
            <div className="hidden lg:flex items-center gap-2 bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-amber-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <ListIcon className="w-4 h-4" />
                Liste
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  viewMode === 'split'
                    ? 'bg-white text-amber-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white text-amber-600'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                Karte
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Filters */}
          <aside className="lg:w-80 flex-shrink-0">
            <FilterSidebar
              onFilterChange={setFilters}
              availableHoneyTypes={availableHoneyTypes}
              totalResults={filteredBeekeepers.length}
            />
          </aside>

          {/* Right Content Area */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {filteredBeekeepers.length}{' '}
                    {filteredBeekeepers.length === 1 ? 'Imker gefunden' : 'Imker gefunden'}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Sortiert nach Entfernung und Verfügbarkeit
                  </p>
                </div>

                {/* Split View - Dynamic shrinking map on scroll */}
                {viewMode === 'split' && (
                  <div className="space-y-4">
                    {/* Fixed Map Section - Dynamic height (50vh -> 25vh on scroll) */}
                    <div
                      className="sticky top-0 z-10 w-full bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ease-out"
                      style={{ height: `${mapHeight}vh` }}
                    >
                      <BeekeeperMap
                        beekeepers={filteredBeekeepers}
                        onMarkerClick={handleMarkerClick}
                      />
                    </div>

                    {/* Beekeeper Cards Section */}
                    {filteredBeekeepers.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg shadow">
                        <span className="text-6xl mb-4 block">🔍</span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Keine Imker gefunden
                        </h3>
                        <p className="text-gray-600">
                          Versuche die Filter anzupassen oder erweitere den Suchradius
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-8">
                        {filteredBeekeepers.map((beekeeper) => (
                          <BeekeeperCard
                            key={beekeeper.id}
                            beekeeper={beekeeper}
                            onClick={() => handleCardClick(beekeeper)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <div className="space-y-4">
                    {filteredBeekeepers.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg shadow">
                        <span className="text-6xl mb-4 block">🔍</span>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Keine Imker gefunden
                        </h3>
                        <p className="text-gray-600">
                          Versuche die Filter anzupassen oder erweitere den Suchradius
                        </p>
                      </div>
                    ) : (
                      filteredBeekeepers.map((beekeeper) => (
                        <BeekeeperCard
                          key={beekeeper.id}
                          beekeeper={beekeeper}
                          onClick={() => handleCardClick(beekeeper)}
                        />
                      ))
                    )}
                  </div>
                )}

                {/* Map View */}
                {viewMode === 'map' && (
                  <div className="h-[calc(100vh-250px)] bg-white rounded-lg shadow-md overflow-hidden">
                    <BeekeeperMap
                      beekeepers={filteredBeekeepers}
                      onMarkerClick={handleMarkerClick}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-amber-600">{beekeepers.length}</div>
              <div className="text-gray-600 mt-1">Registrierte Imker</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600">
                {availableHoneyTypes.length}
              </div>
              <div className="text-gray-600 mt-1">Honigsorten verfügbar</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600">100%</div>
              <div className="text-gray-600 mt-1">Regional & Nachhaltig</div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}