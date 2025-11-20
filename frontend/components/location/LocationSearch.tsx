'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';

interface LocationSearchProps {
  onLocationChange: (location: { latitude: number; longitude: number; address: string } | null) => void;
  currentLocation?: string;
}

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationSearch({ onLocationChange, currentLocation }: LocationSearchProps) {
  const [searchValue, setSearchValue] = useState(currentLocation || '');
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ NEU: Autocomplete States
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // ✅ NEU: Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ NEU: Update searchValue when currentLocation changes
  useEffect(() => {
    setSearchValue(currentLocation || '');
  }, [currentLocation]);

  // ✅ NEU: Fetch address suggestions with debouncing
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=at,de,ch`, // Fokus auf DACH-Region
        {
          headers: {
            'Accept-Language': 'de',
          },
        }
      );
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err: unknown) {
      console.error('Autocomplete Error:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // ✅ NEU: Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setSearchValue(value);
    setError('');

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer for autocomplete
    if (value.trim().length >= 3) {
      debounceTimer.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300); // 300ms debounce
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // ✅ NEU: Handle suggestion selection
  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearchValue(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    
    onLocationChange({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name,
    });
  };

  // ✅ NEU: Handle reset/clear location
  const handleReset = () => {
    setSearchValue('');
    setError('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationChange(null); // ✅ null signalisiert "Location zurücksetzen"
  };

  const handleGPSClick = () => {
    setIsLoadingGPS(true);
    setError('');

    if (!navigator.geolocation) {
      setError('GPS wird von deinem Browser nicht unterstützt');
      setIsLoadingGPS(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'Accept-Language': 'de',
              },
            }
          );
          const data = await response.json();
          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setSearchValue(address);
          onLocationChange({ latitude, longitude, address });
        } catch (err: unknown) {
          const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setSearchValue(address);
          onLocationChange({ latitude, longitude, address });
          console.error('Reverse geocoding error:', err);
        }
        
        setIsLoadingGPS(false);
      },
      (error) => {
        setError('Standortzugriff verweigert');
        setIsLoadingGPS(false);
        console.error('GPS Error:', error);
      }
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setError('');
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'de',
          },
        }
      );
      const data = await response.json();

      if (data && data[0]) {
        const { lat, lon, display_name } = data[0];
        setSearchValue(display_name);
        onLocationChange({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          address: display_name,
        });
        setSuggestions([]);
        setShowSuggestions(false);
      } else {
        setError('Standort nicht gefunden');
      }
    } catch (err: unknown) {
      setError('Fehler bei der Suche');
      console.error('Geocoding Error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 max-w-xl" ref={wrapperRef}>
      <form onSubmit={handleSearch} className="flex-1 relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Standort eingeben (z.B. Wien, 1010)"
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          />
          
          {/* ✅ NEU: Clear/Reset Button */}
          {searchValue && (
            <button
              type="button"
              onClick={handleReset}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors z-10"
              title="Standort zurücksetzen"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* ✅ NEU: Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {isLoadingSuggestions ? (
              <div className="p-3 text-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Lade Vorschläge...
              </div>
            ) : (
              <ul>
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors flex items-start gap-2 border-b border-gray-100 last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                      <span className="text-sm text-gray-700 line-clamp-2">
                        {suggestion.display_name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="absolute left-0 top-full mt-1 text-xs text-red-600">{error}</p>
        )}
      </form>

      {/* GPS Button */}
      <button
        type="button"
        onClick={handleGPSClick}
        disabled={isLoadingGPS}
        className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        title="Aktuellen Standort verwenden"
      >
        {isLoadingGPS ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Navigation className="w-5 h-5" />
        )}
      </button>

      {/* Search Button */}
      <button
        type="submit"
        onClick={handleSearch}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors flex-shrink-0"
      >
        Suchen
      </button>
    </div>
  );
}