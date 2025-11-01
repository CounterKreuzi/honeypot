'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/beekeeper';
import { calculateDistance, formatDistance } from '@/lib/mapHelpers';

// Fix Leaflet Default Icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });
}

// Österreich Bounds
const AUSTRIA_CENTER: [number, number] = [47.5, 13.5];
const AUSTRIA_BOUNDS: [[number, number], [number, number]] = [
  [46.4, 9.5],
  [49.0, 17.2]
];

// Map Controller Component
function MapController({ 
  userLocation, 
  beekeepers 
}: { 
  userLocation: [number, number] | null; 
  beekeepers: Beekeeper[] 
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (userLocation && beekeepers.length > 0) {
      try {
        // Finde nächsten Imker
        const nearest = beekeepers.reduce((prev, curr) => {
          const prevDist = calculateDistance(userLocation, [prev.latitude, prev.longitude]);
          const currDist = calculateDistance(userLocation, [curr.latitude, curr.longitude]);
          return currDist < prevDist ? curr : prev;
        });

        // Erstelle Bounds für User + nächster Imker
        const bounds = L.latLngBounds([
          userLocation,
          [nearest.latitude, nearest.longitude]
        ]);

        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
          animate: true,
          duration: 1.5
        });
      } catch (error) {
        console.error('Map bounds error:', error);
        map.setView(userLocation, 12);
      }
    } else if (userLocation) {
      // Nur User-Standort
      map.setView(userLocation, 12, { animate: true, duration: 1.5 });
    } else {
      // Kein Standort → Ganz Österreich
      map.fitBounds(AUSTRIA_BOUNDS, {
        padding: [20, 20],
        animate: true,
        duration: 1.5
      });
    }
  }, [userLocation, beekeepers, map]);

  return null;
}

export const MapView = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [beekeepers, setBeekeepers] = useState<Beekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);

  const requestLocation = () => {
    setLocationError(null);
    setRequestingLocation(true);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation wird nicht unterstützt');
      setRequestingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
        setRequestingLocation(false);
      },
      (error) => {
        console.error('Standort-Fehler:', error);
        setLocationError('Standort konnte nicht ermittelt werden');
        setRequestingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    const fetchBeekeepers = async () => {
      try {
        const response = await fetch('/api/beekeepers');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validiere dass data ein Array ist
        if (Array.isArray(data)) {
          setBeekeepers(data);
        } else {
          console.warn('API returned invalid data format');
          setBeekeepers([]);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Imker:', error);
        setBeekeepers([]); // Leerer Array als Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchBeekeepers();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">🍯</div>
          <p className="text-lg text-amber-800">Lade Karte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      <MapContainer
        center={AUSTRIA_CENTER}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController 
          userLocation={userLocation} 
          beekeepers={beekeepers} 
        />

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>
              <div className="p-2">
                <p className="font-bold text-blue-600">📍 Dein Standort</p>
              </div>
            </Popup>
          </Marker>
        )}

        {beekeepers.map((bk) => {
          const distance = userLocation 
            ? calculateDistance(userLocation, [bk.latitude, bk.longitude])
            : null;

          return (
            <Marker 
              key={bk.id} 
              position={[bk.latitude, bk.longitude]}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-bold text-lg text-amber-800 mb-1">{bk.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {bk.address}, {bk.city}
                  </p>
                  
                  {distance && (
                    <p className="text-xs text-blue-600 font-semibold mb-2">
                      📏 {formatDistance(distance)} entfernt
                    </p>
                  )}
                  
                  {bk.honeyTypes && bk.honeyTypes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700">🍯 Sorten:</p>
                      <p className="text-xs text-gray-600">{bk.honeyTypes.join(', ')}</p>
                    </div>
                  )}
                  
                  {bk.phone && (
                    <p className="text-xs text-gray-600 mb-2">📞 {bk.phone}</p>
                  )}
                  
                  <a 
                    href={`/imker/${bk.id}`}
                    className="mt-2 block text-center bg-amber-500 text-white px-3 py-1.5 rounded text-sm hover:bg-amber-600 transition"
                  >
                    Details ansehen
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Standort-Button */}
      <button
        onClick={requestLocation}
        disabled={requestingLocation}
        className="absolute bottom-24 right-4 z-[1000] bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        title="Meinen Standort nutzen"
      >
        {requestingLocation ? (
          <span className="text-2xl animate-pulse">⏳</span>
        ) : (
          <span className="text-2xl">📍</span>
        )}
      </button>

      {/* Error Message */}
      {locationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <p className="text-sm font-medium">{locationError}</p>
          <button 
            onClick={() => setLocationError(null)}
            className="text-xs underline mt-1"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="absolute top-20 left-4 z-[1000] bg-white p-4 rounded-lg shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🍯</span>
          <h3 className="font-bold text-amber-800">Honeypot</h3>
        </div>
        <p className="text-sm text-gray-600">
          {beekeepers.length} Imker {beekeepers.length === 0 ? '(Mock-Daten)' : 'registriert'}
        </p>
        {userLocation && (
          <p className="text-xs text-blue-600 mt-1 font-semibold">
            ✓ Standort aktiv
          </p>
        )}
      </div>
    </div>
  );
};
