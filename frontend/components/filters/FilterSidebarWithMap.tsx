'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, MapPin, Euro, Clock, Maximize2, Package, Info } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Beekeeper } from '@/types/api';

const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <p className="text-xs text-gray-600">Karte wird geladen...</p>
    </div>
  ),
});

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  availableHoneyTypes: string[];
  totalResults: number;
  beekeepers: Beekeeper[];
  onMapExpand: () => void;
  onMarkerClick?: (beekeeper: Beekeeper) => void;
  userLocation?: [number, number];
  activeBeekeeperIds?: string[];
}

export interface FilterState {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  openNow: boolean;
  hasWebsite: boolean;
  jarSize: 250 | 500 | 1000 | null;
}

// ✅ Bessere Werte für ganz Österreich sichtbar
const DEFAULT_CENTER: [number, number] = [47.5, 13.0];
const DEFAULT_ZOOM = 6;
const LOCATION_ZOOM = 10;

export default function FilterSidebar({
  onFilterChange,
  availableHoneyTypes,
  totalResults,
  beekeepers,
  onMapExpand,
  onMarkerClick,
  userLocation,
  activeBeekeeperIds,
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    honeyTypes: [],
    priceRange: [0, 50],
    maxDistance: 50,
    openNow: false,
    hasWebsite: false,
    jarSize: null,
  });

  const [expandedSections, setExpandedSections] = useState({
    honeyTypes: true,
    price: true,
    jarSize: true,
    distance: true,
    availability: true,
  });

  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);

  // ✅ VERBESSERTE Drag Detection
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    hasMoved: false,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignoriere Klicks auf Buttons und Links
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('.leaflet-marker-icon')) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const dx = Math.abs(e.clientX - dragStateRef.current.startX);
    const dy = Math.abs(e.clientY - dragStateRef.current.startY);

    // Wenn Bewegung > 5px, dann ist es ein Drag
    if (dx > 5 || dy > 5) {
      dragStateRef.current.hasMoved = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const target = e.target as HTMLElement;
    
    // Ignoriere Klicks auf Markers, Buttons, Popups
    if (
      target.closest('.leaflet-marker-icon') ||
      target.closest('.leaflet-popup') ||
      target.closest('button') ||
      target.closest('a')
    ) {
      dragStateRef.current.isDragging = false;
      return;
    }

    // Nur Modal öffnen wenn es KEIN Drag war
    if (!dragStateRef.current.hasMoved) {
      onMapExpand();
    }

    dragStateRef.current = {
      isDragging: false,
      startX: 0,
      startY: 0,
      hasMoved: false,
    };
  };

  const handleMouseLeave = () => {
    // Reset bei Mouse Leave
    dragStateRef.current = {
      isDragging: false,
      startX: 0,
      startY: 0,
      hasMoved: false,
    };
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const updateFilters = (updates: Partial<FilterState>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const toggleHoneyType = (type: string) => {
    const newTypes = filters.honeyTypes.includes(type)
      ? filters.honeyTypes.filter((t) => t !== type)
      : [...filters.honeyTypes, type];
    updateFilters({ honeyTypes: newTypes });
  };

  const clearAllFilters = () => {
    const defaultFilters: FilterState = {
      honeyTypes: [],
      priceRange: [0, 50],
      maxDistance: 50,
      openNow: false,
      hasWebsite: false,
      jarSize: null,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount =
    filters.honeyTypes.length +
    (filters.openNow ? 1 : 0) +
    (filters.hasWebsite ? 1 : 0) +
    (filters.maxDistance < 50 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 50 ? 1 : 0) +
    (filters.jarSize ? 1 : 0);

  // Update map center/zoom when userLocation changes
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      setMapZoom(LOCATION_ZOOM);
    } else {
      setMapCenter(DEFAULT_CENTER);
      setMapZoom(DEFAULT_ZOOM);
    }
  }, [userLocation]);

  return (
    <div className="space-y-4">
      {/* Kleine Kartenvorschau */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        {/* ✅ NEUE LÖSUNG: Wrapper mit Mouse Events */}
        <div 
          className="relative h-48 group cursor-pointer"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Karte - komplett interaktiv */}
          <BeekeeperMap
            beekeepers={beekeepers}
            onMarkerClick={onMarkerClick}
            center={mapCenter}
            zoom={mapZoom}
            mapId="map-sidebar-preview"
            userLocation={userLocation}
            showPopups={false}
            activeBeekeeperIds={activeBeekeeperIds}
          />
          
          {/* ✅ Hover Overlay nur für visuelles Feedback */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity duration-300 pointer-events-none" />
          
          {/* ✅ Info Badge */}
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md pointer-events-none">
            <p className="text-xs font-medium text-gray-700">
              {beekeepers.length} {beekeepers.length === 1 ? 'Imker' : 'Imker'}
            </p>
          </div>

          {/* ✅ Maximize Button - rechts oben */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapExpand();
            }}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white p-2 rounded-lg shadow-lg transition-all duration-300 hover:scale-110 z-10"
            title="Karte vergrößern"
          >
            <Maximize2 className="w-4 h-4 text-amber-600" />
          </button>

          {/* ✅ Hinweis zum Klicken */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <p className="text-xs bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-md text-gray-700">
              Klick zum Vergrößern
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bereich */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 sticky top-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                Zurücksetzen
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {totalResults} {totalResults === 1 ? 'Ergebnis' : 'Ergebnisse'}
          </p>
        </div>

        <div>
          {/* Max. Entfernung Filter */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Max. Entfernung</span>
            </div>
            <div className="px-4 pb-4">
              <div className="space-y-3">
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={filters.maxDistance}
                  onChange={(e) => updateFilters({ maxDistance: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">1 km</span>
                  <span className="font-semibold text-gray-900">{filters.maxDistance} km</span>
                </div>
                {!userLocation && (
                  <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                    💡 Gib einen Standort ein, um Imker in deiner Nähe zu finden
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Preis Filter */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center gap-2">
              <Euro className="w-5 h-5 text-gray-600" />
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">Preis</span>
                <span
                  className="inline-flex"
                  title="Gefiltert wird nach dem günstigsten Preis für die ausgewählten Mengen"
                  aria-label="Gefiltert wird nach dem günstigsten Preis für die ausgewählten Mengen"
                >
                  <Info className="w-4 h-4 text-gray-400" aria-hidden="true" focusable="false" />
                </span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="space-y-3">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    updateFilters({
                      priceRange: [filters.priceRange[0], parseInt(e.target.value)],
                    })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">€{filters.priceRange[0]}</span>
                  <span className="font-semibold text-gray-900">bis €{filters.priceRange[1]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Glasgröße Filter */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-900">Füllmenge</span>
            </div>
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {[250, 500, 1000].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      updateFilters({ jarSize: filters.jarSize === size ? null : (size as 250 | 500 | 1000) })
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      filters.jarSize === size
                        ? 'border-amber-600 bg-amber-50 text-amber-700'
                        : 'border-gray-200 text-gray-700 hover:border-amber-200'
                    }`}
                  >
                    {size}g
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Honigsorten Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('honeyTypes')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">🍯</span>
                <span className="font-medium text-gray-900">Honigsorten</span>
                {filters.honeyTypes.length > 0 && (
                  <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {filters.honeyTypes.length}
                  </span>
                )}
              </div>
              {expandedSections.honeyTypes ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.honeyTypes && (
              <div className="px-4 pb-4 space-y-2">
                {availableHoneyTypes.length > 0 ? (
                  availableHoneyTypes.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={filters.honeyTypes.includes(type)}
                        onChange={() => toggleHoneyType(type)}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">{type}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-2">Keine Honigsorten verfügbar</p>
                )}
              </div>
            )}
          </div>

          {/* Preis Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('price')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-gray-600" />
              <div className="flex items-center gap-1">
                <span className="font-medium text-gray-900">Preis</span>
                <span
                  className="inline-flex"
                  title="Gefiltert wird nach dem günstigsten Preis für die ausgewählten Mengen"
                  aria-label="Gefiltert wird nach dem günstigsten Preis für die ausgewählten Mengen"
                >
                  <Info className="w-4 h-4 text-gray-400" aria-hidden="true" focusable="false" />
                </span>
              </div>
              </div>
              {expandedSections.price ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.price && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={filters.priceRange[1]}
                    onChange={(e) =>
                      updateFilters({
                        priceRange: [filters.priceRange[0], parseInt(e.target.value)],
                      })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">€{filters.priceRange[0]}</span>
                    <span className="font-semibold text-gray-900">
                      bis €{filters.priceRange[1]}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Glasgröße Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('jarSize')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Füllmenge</span>
              </div>
              {expandedSections.jarSize ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.jarSize && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {[250, 500, 1000].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() =>
                        updateFilters({ jarSize: filters.jarSize === size ? null : (size as 250 | 500 | 1000) })
                      }
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        filters.jarSize === size
                          ? 'border-amber-600 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-700 hover:border-amber-200'
                      }`}
                    >
                      {size}g
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Max. Entfernung Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('distance')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Max. Entfernung</span>
              </div>
              {expandedSections.distance ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.distance && (
              <div className="px-4 pb-4">
                <div className="space-y-3">
                  <input
                    type="range"
                    min="1"
                    max="200"
                    value={filters.maxDistance}
                    onChange={(e) =>
                      updateFilters({ maxDistance: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">1 km</span>
                    <span className="font-semibold text-gray-900">
                      {filters.maxDistance} km
                    </span>
                  </div>
                  {!userLocation && (
                    <p className="text-xs text-amber-600 mt-2 p-2 bg-amber-50 rounded">
                      💡 Gib einen Standort ein, um Imker in deiner Nähe zu finden
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verfügbarkeit Filter */}
          <div className="border-b border-gray-200">
            <button
              onClick={() => toggleSection('availability')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Verfügbarkeit</span>
              </div>
              {expandedSections.availability ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {expandedSections.availability && (
              <div className="px-4 pb-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.openNow}
                    onChange={(e) => updateFilters({ openNow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Jetzt geöffnet</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.hasWebsite}
                    onChange={(e) => updateFilters({ hasWebsite: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Mit Online-Shop</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}