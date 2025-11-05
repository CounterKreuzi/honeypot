'use client';

import { useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

interface LocationSearchProps {
  onLocationChange: (location: { latitude: number; longitude: number; address: string }) => void;
  currentLocation?: string;
}

export default function LocationSearch({ onLocationChange, currentLocation }: LocationSearchProps) {
  const [searchValue, setSearchValue] = useState(currentLocation || '');
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  const [error, setError] = useState('');

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
        
        // Reverse Geocoding (optional - kann auch ohne gemacht werden)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const address = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          
          setSearchValue(address);
          onLocationChange({ latitude, longitude, address });
        } catch (err) {
          // Fallback ohne Adresse
          const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setSearchValue(address);
          onLocationChange({ latitude, longitude, address });
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

    try {
      // Geocoding über Nominatim (OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchValue)}`
      );
      const data = await response.json();

      if (data && data[0]) {
        const { lat, lon, display_name } = data[0];
        onLocationChange({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          address: display_name,
        });
      } else {
        setError('Standort nicht gefunden');
      }
    } catch (err) {
      setError('Fehler bei der Suche');
      console.error('Geocoding Error:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 max-w-xl">
      <form onSubmit={handleSearch} className="flex-1 relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Standort eingeben (z.B. Wien, 1010)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
          />
        </div>
        {error && (
          <p className="absolute left-0 top-full mt-1 text-xs text-red-600">{error}</p>
        )}
      </form>

      <button
        type="button"
        onClick={handleGPSClick}
        disabled={isLoadingGPS}
        className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Aktuellen Standort verwenden"
      >
        {isLoadingGPS ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Navigation className="w-5 h-5" />
        )}
      </button>

      <button
        type="submit"
        onClick={handleSearch}
        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
      >
        Suchen
      </button>
    </div>
  );
}
