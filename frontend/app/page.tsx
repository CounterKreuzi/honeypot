'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBeekeeperStore } from '@/lib/store/beekeeperStore';
import { beekeepersApi } from '@/lib/api/beekeepers';
import { Beekeeper } from '@/types/api';
import FilterSidebarWithMap from '@/components/filters/FilterSidebarWithMap';
import BeekeeperCard from '@/components/cards/BeekeeperCard';
import LocationSearch from '@/components/location/LocationSearch';
import MapModal from '@/components/modals/MapModal';
import BeekeeperDetailModal from '@/components/modals/BeekeeperDetailModal'; // ✅ NEU
import { Loader2, SlidersHorizontal } from 'lucide-react';

interface Filters {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  hasWebsite: boolean;
  openNow: boolean;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
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

  const [filters, setFilters] = useState<Filters>({
    honeyTypes: [],
    priceRange: [0, 50],
    maxDistance: 50,
    hasWebsite: false,
    openNow: false,
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // ✅ NEU
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'name' | 'price'>('distance');

  useEffect(() => {
    loadBeekeepers();
  }, []);

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

  // Handle location change from LocationSearch
  const handleLocationChange = async (location: UserLocation) => {
    setUserLocation(location);
    try {
      setLoading(true);
      const data = await beekeepersApi.searchNearby(
        location.latitude,
        location.longitude,
        filters.maxDistance
      );
      setBeekeepers(data);
      setError(null);
    } catch (error) {
      console.error('Failed to search beekeepers:', error);
      setError('Fehler bei der Suche');
    } finally {
      setLoading(false);
    }
  };

  // Extract available honey types
  const availableHoneyTypes = useMemo(() => {
    const types = new Set<string>();
    beekeepers.forEach((beekeeper) => {
      beekeeper.honeyTypes.forEach((honey) => {
        types.add(honey.name);
      });
    });
    return Array.from(types).sort();
  }, [beekeepers]);

  // Filter beekeepers based on current filters
  const filteredBeekeepers = useMemo(() => {
    return beekeepers.filter((beekeeper) => {
      // Honey types filter
      if (
        filters.honeyTypes.length > 0 &&
        !beekeeper.honeyTypes.some((honey) => filters.honeyTypes.includes(honey.name))
      ) {
        return false;
      }

      // Price filter
      const prices = beekeeper.honeyTypes
        .map((h) => (h.price ? parseFloat(h.price) : null))
        .filter((p): p is number => p !== null);

      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        if (minPrice < filters.priceRange[0] || minPrice > filters.priceRange[1]) {
          return false;
        }
      }

      // Distance filter (if user location is set)
      if (userLocation && beekeeper.distance !== undefined) {
        if (beekeeper.distance > filters.maxDistance) {
          return false;
        }
      }

      // Website filter
      if (filters.hasWebsite && !beekeeper.website) {
        return false;
      }

      // OpenNow filter (simplified - enhance with actual opening hours logic)
      if (filters.openNow && !beekeeper.openingHours) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sorting logic
      switch (sortBy) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          const aPrice = Math.min(
            ...a.honeyTypes
              .map((h) => (h.price ? parseFloat(h.price) : Infinity))
              .filter((p) => p !== Infinity)
          );
          const bPrice = Math.min(
            ...b.honeyTypes
              .map((h) => (h.price ? parseFloat(h.price) : Infinity))
              .filter((p) => p !== Infinity)
          );
          return aPrice - bPrice;
        default:
          return 0;
      }
    });
  }, [beekeepers, filters, userLocation, sortBy]);

  // ✅ NEU: Handle marker/pin click - öffnet Detail Modal
  const handleMarkerClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setIsDetailModalOpen(true);
  };

  // ✅ NEU: Handle card click - öffnet Detail Modal
  const handleCardClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setIsDetailModalOpen(true);
  };

  // ✅ NEU: Close detail modal
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    // Optional: Clear selected beekeeper after a delay
    setTimeout(() => setSelectedBeekeeper(null), 300);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <span className="text-5xl drop-shadow-lg">🍯</span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
                  Honeypot
                </h1>
                <p className="text-xs sm:text-sm text-amber-100">
                  Finde lokale Imker in deiner Nähe
                </p>
              </div>
            </div>

            {/* Location Search */}
            <LocationSearch
              onLocationChange={handleLocationChange}
              currentLocation={userLocation?.address}
            />

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
              className="lg:hidden p-2 bg-white text-amber-600 rounded-lg shadow hover:bg-amber-50 transition-colors"
            >
              <SlidersHorizontal className="w-6 h-6" />
            </button>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <button className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors font-medium">
                Imker werden
              </button>
              <button className="px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-semibold">
                Anmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Map Preview + Filters */}
          <aside className={`lg:w-80 flex-shrink-0 ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            <FilterSidebarWithMap
              onFilterChange={setFilters}
              availableHoneyTypes={availableHoneyTypes}
              totalResults={filteredBeekeepers.length}
              beekeepers={filteredBeekeepers}
              onMapExpand={() => setIsMapModalOpen(true)}
              onMarkerClick={handleMarkerClick}
            />
          </aside>

          {/* Right Content Area - Beekeeper Cards */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
                  <p className="text-gray-600">Lade Imker...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Results Header */}
                <div className="mb-4 bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {filteredBeekeepers.length}{' '}
                        {filteredBeekeepers.length === 1 ? 'Imker gefunden' : 'Imker gefunden'}
                      </h2>
                      {userLocation && (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 In der Nähe von {userLocation.address.split(',')[0]}
                        </p>
                      )}
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Sortieren:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      >
                        <option value="distance">Entfernung</option>
                        <option value="name">Name</option>
                        <option value="price">Preis</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Beekeeper Cards Grid */}
                {filteredBeekeepers.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-lg shadow">
                    <span className="text-6xl mb-4 block">🔍</span>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Keine Imker gefunden
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Versuche die Filter anzupassen oder erweitere den Suchradius
                    </p>
                    {userLocation && (
                      <button
                        onClick={() =>
                          setFilters({ ...filters, maxDistance: filters.maxDistance + 20 })
                        }
                        className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                      >
                        Suchradius erweitern
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pb-8">
                    {filteredBeekeepers.map((beekeeper) => (
                      <BeekeeperCard
                        key={beekeeper.id}
                        beekeeper={beekeeper}
                        onClick={() => handleCardClick(beekeeper)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Map Modal */}
      <MapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        beekeepers={filteredBeekeepers}
        onMarkerClick={handleMarkerClick}
        center={
          userLocation
            ? [userLocation.latitude, userLocation.longitude]
            : undefined
        }
        zoom={userLocation ? 10 : 7}
      />

      {/* ✅ NEU: Beekeeper Detail Modal */}
      <BeekeeperDetailModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        beekeeper={selectedBeekeeper}
      />

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
