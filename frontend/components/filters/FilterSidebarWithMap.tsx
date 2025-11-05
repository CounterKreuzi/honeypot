'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, MapPin, Euro, Clock } from 'lucide-react';
import { Beekeeper } from '@/types/api';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  availableHoneyTypes: string[];
  totalResults: number;
  beekeepers: Beekeeper[];
  onMapExpand: () => void;
  onMarkerClick?: (beekeeper: Beekeeper) => void;
}

export interface FilterState {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  openNow: boolean;
  hasWebsite: boolean;
}

export default function FilterSidebar({
  onFilterChange,
  availableHoneyTypes,
  totalResults,
  beekeepers,
  onMapExpand,
  onMarkerClick,
}: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterState>({
    honeyTypes: [],
    priceRange: [0, 50],
    maxDistance: 50,
    openNow: false,
    hasWebsite: false,
  });

  // ✅ ÄNDERUNG 1: Alle Filter standardmäßig aufgeklappt (availability: true)
  const [expandedSections, setExpandedSections] = useState({
    honeyTypes: true,
    price: true,
    distance: true,
    availability: true, // ← Geändert von false auf true
  });

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
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const activeFilterCount =
    filters.honeyTypes.length +
    (filters.openNow ? 1 : 0) +
    (filters.hasWebsite ? 1 : 0) +
    (filters.maxDistance < 50 ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 50 ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* ❌ ÄNDERUNG 2: Kartenvorschau komplett entfernt */}
      
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
          {/* ❌ ÄNDERUNG 3: "X Imker gefunden" Text entfernt */}
        </div>

        {/* ✅ ÄNDERUNG 4: overflow-y-auto und max-h entfernt - scrollt jetzt mit der Seite */}
        <div>
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
                {availableHoneyTypes.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-3 cursor-pointer hover:bg-amber-50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.honeyTypes.includes(type)}
                      onChange={() => toggleHoneyType(type)}
                      className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
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
                <span className="font-medium text-gray-900">Preis pro Glas</span>
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

          {/* Entfernung Filter */}
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
                    max="100"
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
                <label className="flex items-center gap-3 cursor-pointer hover:bg-amber-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.openNow}
                    onChange={(e) => updateFilters({ openNow: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Jetzt geöffnet</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer hover:bg-amber-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={filters.hasWebsite}
                    onChange={(e) => updateFilters({ hasWebsite: e.target.checked })}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Online-Shop verfügbar</span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
