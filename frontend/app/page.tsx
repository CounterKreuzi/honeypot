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
import { BadgeCheck, Droplets, Loader2, MapPin, Package, Ruler } from 'lucide-react';
import Link from 'next/link';

type JarSize = 250 | 500 | 1000;

interface Filters {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  hasWebsite: boolean;
  openNow: boolean;
  jarSizes: JarSize[];
}

interface UserLocation {
  latitude: number;
  longitude: number;
  address: string;
}

const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
});

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

const parsePriceValue = (price: unknown): number | null => {
  if (price === null || price === undefined) return null;

  const numericPrice =
    typeof price === 'string' ? Number(price.replace(',', '.')) : Number(price);

  return Number.isFinite(numericPrice) ? numericPrice : null;
};

const DEFAULT_FILTERS: Filters = {
  honeyTypes: [],
  priceRange: [0, 50],
  maxDistance: 50,
  hasWebsite: false,
  openNow: false,
  jarSizes: [],
};

const getAvailablePrices = (honeyTypes: Beekeeper['honeyTypes']) =>
  honeyTypes.flatMap((honey) =>
    [honey.price250, honey.price500, honey.price1000]
      .map((price) => parsePriceValue(price))
      .filter((price): price is number => price !== null)
  );

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

  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortBy] = useState<'distance' | 'name' | 'price'>('distance');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [openFilter, setOpenFilter] = useState<string | null>(null);

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
  const matchesCommonFilters = useCallback(
    (beekeeper: Beekeeper) => {
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

    if (filters.jarSizes.length > 0) {
      const hasSelectedSize = filters.jarSizes.some((jarSize) => {
        const jarSizeKey = `price${jarSize}` as 'price250' | 'price500' | 'price1000';

        return beekeeper.honeyTypes.some((honey) => {
          const priceForSize = parsePriceValue(honey[jarSizeKey]);
          return priceForSize !== null;
        });
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
    },
    [filters]
  );

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
  }, [beekeepers, filters, matchesCommonFilters, userLocation, sortBy]);

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
  }, [beekeepers, filters, matchesCommonFilters, userLocation]);

  const mapBeekeepers = useMemo(() => {
    if (!userLocation) {
      return filteredBeekeepers;
    }

    return beekeepers.filter((beekeeper: Beekeeper) => matchesCommonFilters(beekeeper));
  }, [beekeepers, filteredBeekeepers, matchesCommonFilters, userLocation]);

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

  const isDistanceDisabled = !userLocation;
  const featuredBeekeeper = filteredBeekeepers[0];

  const toggleFilterDropdown = (key: string) => {
    setOpenFilter((prev) => (prev === key ? null : key));
  };

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setOpenFilter(null);
  };

  const toggleHoneyType = (type: string) => {
    setFilters((prev) => {
      const honeyTypes = prev.honeyTypes.includes(type)
        ? prev.honeyTypes.filter((t) => t !== type)
        : [...prev.honeyTypes, type];
      return { ...prev, honeyTypes };
    });
  };

  const toggleJarSize = (size: JarSize) => {
    setFilters((prev) => {
      const jarSizes = prev.jarSizes.includes(size)
        ? prev.jarSizes.filter((s) => s !== size)
        : [...prev.jarSizes, size];
      return { ...prev, jarSizes };
    });
  };

  const handleDistanceChange = (value: number) => {
    setFilters((prev) => ({ ...prev, maxDistance: value }));
  };

  const handleMaxPriceChange = (value: number) => {
    setFilters((prev) => ({ ...prev, priceRange: [prev.priceRange[0], value] }));
  };


  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🍯</span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600 font-semibold">Honeypot</p>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Lokaler Honig in deiner Nähe</h1>
            </div>
          </div>

          <div className="flex-1 min-w-[260px] flex items-center gap-3 justify-end">
            <div className="flex-1 max-w-xl">
              <LocationSearch
                onLocationChange={handleLocationChange}
                currentLocation={userLocation?.address}
              />
            </div>
            <Link
              href="/imker-werden"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-semibold hover:border-amber-300"
            >
              Imker werden
            </Link>
            {isLoggedIn ? (
              <Link
                href="/meinbereich"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white font-semibold shadow hover:bg-amber-600"
              >
                Profil bearbeiten
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white font-semibold shadow hover:bg-amber-600"
              >
                Anmelden
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Filter:</span>

          <div className="relative">
            <button
              onClick={() => toggleFilterDropdown('distance')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                openFilter === 'distance'
                  ? 'bg-amber-500 text-white border-amber-500 shadow'
                  : 'bg-white text-gray-700 border-amber-200 hover:border-amber-300'
              }`}
              disabled={isDistanceDisabled}
            >
              <MapPin className="w-4 h-4" />
              {isDistanceDisabled ? 'Entfernung (Adresse nötig)' : `${filters.maxDistance} km`}
            </button>
            {openFilter === 'distance' && !isDistanceDisabled && (
              <div className="absolute z-20 mt-2 w-72 bg-white border border-amber-100 rounded-2xl shadow-xl p-3 space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>Suchradius</span>
                  <span className="text-amber-600">{filters.maxDistance} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={filters.maxDistance}
                  onChange={(e) => handleDistanceChange(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5 km</span>
                  <span>200 km</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleFilterDropdown('price')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                openFilter === 'price'
                  ? 'bg-amber-500 text-white border-amber-500 shadow'
                  : 'bg-white text-gray-700 border-amber-200 hover:border-amber-300'
              }`}
            >
              <BadgeCheck className="w-4 h-4" />
              Preis bis {filters.priceRange[1]}€
            </button>
            {openFilter === 'price' && (
              <div className="absolute z-20 mt-2 w-72 bg-white border border-amber-100 rounded-2xl shadow-xl p-3 space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                  <span>Maximaler Preis</span>
                  <span className="text-amber-600">{filters.priceRange[1]}€</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={filters.priceRange[1]}
                  onChange={(e) => handleMaxPriceChange(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5€</span>
                  <span>50€</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleFilterDropdown('jar')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                openFilter === 'jar'
                  ? 'bg-amber-500 text-white border-amber-500 shadow'
                  : 'bg-white text-gray-700 border-amber-200 hover:border-amber-300'
              }`}
            >
              <Package className="w-4 h-4" />
              Gebindegröße
            </button>
            {openFilter === 'jar' && (
              <div className="absolute z-20 mt-2 w-64 bg-white border border-amber-100 rounded-2xl shadow-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Glasgrößen</p>
                <div className="flex flex-wrap gap-2">
                  {[250, 500, 1000].map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleJarSize(size as JarSize)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        filters.jarSizes.includes(size as JarSize)
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'border-gray-200 text-gray-700 hover:border-amber-200'
                      }`}
                    >
                      {size} g
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => toggleFilterDropdown('honey')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors ${
                openFilter === 'honey'
                  ? 'bg-amber-500 text-white border-amber-500 shadow'
                  : 'bg-white text-gray-700 border-amber-200 hover:border-amber-300'
              }`}
            >
              <Droplets className="w-4 h-4" /> Honigsorten
            </button>
            {openFilter === 'honey' && (
              <div className="absolute z-20 mt-2 w-72 bg-white border border-amber-100 rounded-2xl shadow-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sorten</p>
                <div className="flex flex-wrap gap-2">
                  {availableHoneyTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleHoneyType(type)}
                      className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                        filters.honeyTypes.includes(type)
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'border-gray-200 text-gray-700 hover:border-amber-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetFilters}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            Filter zurücksetzen
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-5 items-start">
          <section className="bg-white rounded-3xl border border-amber-100 shadow-sm h-[calc(100vh-230px)] min-h-[560px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5 border-b border-amber-100 bg-amber-50/60">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-amber-700 text-sm font-semibold border border-amber-200">
                  <MapPin className="w-4 h-4" />
                  {userLocation ? userLocation.address.split(',')[0] : 'Österreich'}
                </span>
                <p className="text-sm text-gray-600">
                  {userLocation
                    ? `${filteredBeekeepers.length} Ergebnisse im Umkreis von ${filters.maxDistance} km`
                    : `${filteredBeekeepers.length} Ergebnisse in deiner Nähe`}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600">
                <Ruler className="w-4 h-4 text-amber-600" />
                Sortierung: Beliebteste
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <p className="text-sm text-gray-600">Imker werden geladen...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-2xl p-4">
                  {error}
                </div>
              ) : filteredBeekeepers.length === 0 ? (
                <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4">
                  Keine Imker gefunden. Passe deine Filter an.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredBeekeepers.map((beekeeper: Beekeeper) => (
                    <BeekeeperCard
                      key={beekeeper.id}
                      beekeeper={beekeeper}
                      onClick={() => handleCardClick(beekeeper)}
                    />
                  ))}
                </div>
              )}

              {userLocation && outsideBeekeepers.length > 0 && (
                <div className="pt-4 border-t border-amber-100">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    Imker außerhalb deines Suchradius
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
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
          </section>

          <aside className="relative h-[calc(100vh-230px)] min-h-[560px]">
            <div className="sticky top-24 h-full">
              <div className="relative h-full bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden">
                <div className="absolute inset-4 rounded-2xl overflow-hidden border border-amber-100">
                  <BeekeeperMap
                    beekeepers={mapBeekeepers}
                    onMarkerClick={handleMarkerClick}
                    center={userLocation ? [userLocation.latitude, userLocation.longitude] : undefined}
                    zoom={userLocation ? 10 : 7}
                    userLocation={userLocation ? [userLocation.latitude, userLocation.longitude] : undefined}
                    activeBeekeeperIds={activeBeekeeperIds}
                    invalidateSizeKey={mapBeekeepers.length}
                  />
                </div>

                {featuredBeekeeper && (
                  <div className="absolute top-6 left-6 right-6 sm:right-auto sm:max-w-sm space-y-3 pointer-events-none">
                    <div className="pointer-events-auto bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-amber-100 overflow-hidden">
                      <div className="flex items-center gap-3 p-4 border-b border-amber-50">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl">🍯</div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700">Imker in der Nähe</p>
                          <h3 className="text-lg font-bold text-gray-900">{featuredBeekeeper.name}</h3>
                          {featuredBeekeeper.distance !== undefined && (
                            <p className="text-sm text-gray-600">{featuredBeekeeper.distance} km entfernt</p>
                          )}
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                          <Droplets className="w-4 h-4 text-amber-600" />
                          {featuredBeekeeper.honeyTypes.slice(0, 2).map((honey) => honey.name).join(', ')}
                        </div>
                        <button
                          onClick={() => handleCardClick(featuredBeekeeper)}
                          className="pointer-events-auto px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow hover:bg-amber-600 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </div>

                    <button
                      className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow hover:bg-amber-600 transition-colors"
                      onClick={() => setIsMapModalOpen(true)}
                    >
                      Karte vergrößern
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
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
