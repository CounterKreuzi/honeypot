'use client';

import { useEffect, useState, useMemo } from 'react';
import { useBeekeeperStore } from '@/lib/store/beekeeperStore';
import { beekeepersApi } from '@/lib/api/beekeepers';
import { Beekeeper } from '@/types/api';
import FilterSidebarWithMap from '@/components/filters/FilterSidebarWithMap';
import BeekeeperCard from '@/components/cards/BeekeeperCard';
import LocationSearch from '@/components/location/LocationSearch';
import MapModal from '@/components/modals/MapModal';
import BeekeeperDetailModal from '@/components/modals/BeekeeperDetailModal';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Filters {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  hasWebsite: boolean;
  openNow: boolean;
  jarSize: 250 | 500 | 1000 | null;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
}

const calculateDistanceKm = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number => {
  const lat1 = fromLat * (Math.PI / 180);
  const lat2 = toLat * (Math.PI / 180);
  const deltaLat = (toLat - fromLat) * (Math.PI / 180);
  const deltaLng = (toLng - fromLng) * (Math.PI / 180);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const getAvailablePrices = (honeyTypes: Beekeeper['honeyTypes']) =>
  honeyTypes.flatMap((honey) =>
    [honey.price250, honey.price500, honey.price1000].filter(
      (price): price is number => typeof price === 'number' && !Number.isNaN(price)
    )
  );

export default function Home() {
  const router = useRouter();
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
    jarSize: null,
  });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'name' | 'price'>('distance');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initial load - alle Imker ohne Location
  useEffect(() => {
    loadBeekeepers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check auth state for header
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsLoggedIn(Boolean(token));
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
      router.push('/');
    }
  };

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

  // Handle location change OR reset from LocationSearch
  const handleLocationChange = async (location: UserLocation | null) => {
    // Wenn location null ist (Reset), lade alle Imker
    if (location === null) {
      console.log('🔄 Standort zurückgesetzt - lade alle Imker');
      setUserLocation(null);
      await loadBeekeepers();
      return;
    }

    console.log('🔍 Standort-Suche gestartet:', location);

    setUserLocation(location);

    try {
      setLoading(true);

      const data = await beekeepersApi.getAll();

      const beekeepersWithDistance = data
        .map((beekeeper: Beekeeper) => {
          const beekeeperLat = parseFloat(beekeeper.latitude.toString());
          const beekeeperLng = parseFloat(beekeeper.longitude.toString());

          if (Number.isNaN(beekeeperLat) || Number.isNaN(beekeeperLng)) {
            return beekeeper;
          }

          const distance = calculateDistanceKm(
            location.latitude,
            location.longitude,
            beekeeperLat,
            beekeeperLng
          );

          return {
            ...beekeeper,
            distance: Math.round(distance * 100) / 100,
          };
        })
        .sort(
          (a, b) => (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY)
        );

      console.log(
        `✅ ${beekeepersWithDistance.filter((b) => (b.distance ?? Infinity) <= filters.maxDistance).length} Imker gefunden im Umkreis von ${filters.maxDistance}km`
      );

      setBeekeepers(beekeepersWithDistance);
      setError(null);

      if (
        beekeepersWithDistance.filter((b) =>
          b.distance !== undefined ? b.distance <= filters.maxDistance : false
        ).length === 0
      ) {
        setError(
          `Leider ist im ausgewählten Suchradius kein Imker verfügbar. Suchradius: ${filters.maxDistance}km`
        );
      }
    } catch (error) {
      console.error('Failed to search beekeepers:', error);
      setError('Fehler bei der Standort-Suche. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Extract available honey types
  const availableHoneyTypes = useMemo(() => {
    const types = new Set<string>();
    beekeepers.forEach((beekeeper: Beekeeper) => {
      beekeeper.honeyTypes.forEach((honey) => {
        types.add(honey.name);
      });
    });
    return Array.from(types).sort();
  }, [beekeepers]);

  // Filter beekeepers based on current filters
  const matchesCommonFilters = (beekeeper: Beekeeper) => {
    // Honey types filter
    if (
      filters.honeyTypes.length > 0 &&
      !beekeeper.honeyTypes.some((honey) => filters.honeyTypes.includes(honey.name))
    ) {
      return false;
    }

    // Price filter
    const prices = getAvailablePrices(beekeeper.honeyTypes);
    if (prices.length > 0) {
      const cheapestPrice = Math.min(...prices);
      if (cheapestPrice < filters.priceRange[0] || cheapestPrice > filters.priceRange[1]) {
        return false;
      }
    }

    if (filters.jarSize) {
      const jarSizeKey = `price${filters.jarSize}` as 'price250' | 'price500' | 'price1000';
      const hasSelectedSize = beekeeper.honeyTypes.some((honey) => {
        const priceForSize = honey[jarSizeKey];
        return typeof priceForSize === 'number' && !Number.isNaN(priceForSize);
      });

      if (!hasSelectedSize) {
        return false;
      }
    }

    // Website filter
    if (filters.hasWebsite && !beekeeper.website) {
      return false;
    }

    // OpenNow filter
    if (filters.openNow && !beekeeper.openingHours) {
      return false;
    }

    return true;
  };

  const filteredBeekeepers = useMemo(() => {
    const insideRadius = beekeepers.filter((beekeeper: Beekeeper) => {
      if (!matchesCommonFilters(beekeeper)) {
        return false;
      }

      if (userLocation && beekeeper.distance !== undefined) {
        return beekeeper.distance <= filters.maxDistance;
      }

      return true;
    });

    return insideRadius.sort((a: Beekeeper, b: Beekeeper) => {
      // Sorting logic
      switch (sortBy) {
        case 'distance':
          return (a.distance || 999) - (b.distance || 999);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          const aPrices = getAvailablePrices(a.honeyTypes);
          const bPrices = getAvailablePrices(b.honeyTypes);
          const aPrice = aPrices.length > 0 ? Math.min(...aPrices) : Infinity;
          const bPrice = bPrices.length > 0 ? Math.min(...bPrices) : Infinity;
          if (!Number.isFinite(aPrice) && !Number.isFinite(bPrice)) {
            return 0;
          }
          if (!Number.isFinite(aPrice)) {
            return 1;
          }
          if (!Number.isFinite(bPrice)) {
            return -1;
          }
          return aPrice - bPrice;
        default:
          return 0;
      }
    });
  }, [beekeepers, filters, userLocation, sortBy]);

  const outsideBeekeepers = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    return beekeepers
      .filter((beekeeper: Beekeeper) => {
        if (!matchesCommonFilters(beekeeper)) {
          return false;
        }

        return beekeeper.distance !== undefined && beekeeper.distance > filters.maxDistance;
      })
      .sort(
        (a: Beekeeper, b: Beekeeper) => (a.distance || Infinity) - (b.distance || Infinity)
      );
  }, [beekeepers, filters, userLocation]);

  const mapBeekeepers = useMemo(() => {
    if (!userLocation) {
      return filteredBeekeepers;
    }

    return beekeepers.filter((beekeeper: Beekeeper) => matchesCommonFilters(beekeeper));
  }, [
    beekeepers,
    filteredBeekeepers,
    userLocation,
    filters.honeyTypes,
    filters.priceRange,
    filters.hasWebsite,
    filters.openNow,
    filters.jarSize,
  ]);

  const activeBeekeeperIds = useMemo(
    () => filteredBeekeepers.map((beekeeper: Beekeeper) => beekeeper.id),
    [filteredBeekeepers]
  );

  const handleMarkerClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setIsDetailModalOpen(true);
  };

  const handleCardClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
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
              {isLoggedIn ? (
                <>
                  <Link href="/meinbereich" className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors font-medium">
                    Mein Bereich
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-semibold"
                  >
                    Ausloggen
                  </button>
                </>
              ) : (
                <>
                  <Link href="/imker-werden" className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors font-medium">
                    Imker werden
                  </Link>
                  <Link href="/login" className="px-4 py-2 bg-white text-amber-600 hover:bg-amber-50 rounded-lg transition-colors font-semibold">
                    Anmelden
                  </Link>
                </>
              )}
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
              beekeepers={mapBeekeepers}
              onMapExpand={() => setIsMapModalOpen(true)}
              onMarkerClick={handleMarkerClick}
              userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : undefined}
              activeBeekeeperIds={activeBeekeeperIds}
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
                      {userLocation ? (
                        <p className="text-sm text-gray-600 mt-1">
                          📍 In der Nähe von {userLocation.address.split(',')[0]}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600 mt-1">
                          🌍 Alle Imker in Österreich
                        </p>
                      )}
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Sortieren:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'distance' | 'name' | 'price')}
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
                  <div className="py-10 bg-white rounded-lg shadow px-4 sm:px-8">
                    <div className="text-center">
                      <span className="text-6xl mb-4 block">🔍</span>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {userLocation
                          ? 'Leider ist im ausgewählten Suchradius kein Imker verfügbar'
                          : 'Keine Imker gefunden'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {userLocation
                          ? 'Hier sind die nächsten Imker außerhalb deines Suchradius oder erweitere den Radius, um mehr Ergebnisse zu sehen.'
                          : 'Gib einen Standort ein, um Imker in deiner Nähe zu finden'}
                      </p>
                      {userLocation && (
                        <button
                          onClick={() =>
                            setFilters({ ...filters, maxDistance: Math.min(filters.maxDistance + 20, 200) })
                          }
                          className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
                        >
                          Suchradius erweitern ({filters.maxDistance + 20}km)
                        </button>
                      )}
                    </div>

                    {userLocation && outsideBeekeepers.length > 0 && (
                      <div className="mt-8">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">
                          Nächste Imker außerhalb Ihres Suchradius
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {outsideBeekeepers.map((beekeeper: Beekeeper) => (
                            <BeekeeperCard
                              key={beekeeper.id}
                              beekeeper={beekeeper}
                              onClick={() => handleCardClick(beekeeper)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pb-8">
                    {filteredBeekeepers.map((beekeeper: Beekeeper) => (
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
        beekeepers={mapBeekeepers}
        onMarkerClick={handleMarkerClick}
        center={
          userLocation
            ? [userLocation.latitude, userLocation.longitude]
            : undefined
        }
        zoom={userLocation ? 10 : 7}
        userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : undefined}
        activeBeekeeperIds={activeBeekeeperIds}
      />

      {/* Beekeeper Detail Modal */}
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
