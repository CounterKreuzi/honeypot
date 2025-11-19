'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, MapPin, Euro, Clock, Package, Info } from 'lucide-react';

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void;
  availableHoneyTypes: string[];
  totalResults: number;
}

export interface FilterState {
  honeyTypes: string[];
  priceRange: [number, number];
  maxDistance: number;
  openNow: boolean;
  hasWebsite: boolean;
  jarSize: 250 | 500 | 1000 | null;
}

export default function FilterSidebar({
  onFilterChange,
  availableHoneyTypes,
  totalResults,
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
    availability: false,
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

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Filter</h2>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Alle löschen
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {totalResults} {totalResults === 1 ? 'Imker' : 'Imker'} gefunden
        </p>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
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
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
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
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={filters.honeyTypes.includes(type)}
                    onChange={() => toggleHoneyType(type)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-700 hover:border-blue-200'
                    }`}
                  >
                    {size}g
                  </button>
                ))}
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
                  max="50"
                  value={filters.maxDistance}
                  onChange={(e) =>
                    updateFilters({ maxDistance: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={filters.openNow}
                  onChange={(e) => updateFilters({ openNow: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Jetzt geöffnet</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={filters.hasWebsite}
                  onChange={(e) => updateFilters({ hasWebsite: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Online-Shop verfügbar</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="p-4 bg-blue-50 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              {activeFilterCount} aktive Filter
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.honeyTypes.map((type) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 bg-white px-2 py-1 rounded-full text-xs text-gray-700 border border-gray-200"
              >
                {type}
                <button
                  onClick={() => toggleHoneyType(type)}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}