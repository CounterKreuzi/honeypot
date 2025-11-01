'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/beekeeper';
import { AUSTRIA_BOUNDS, formatDistance, calculateDistance } from '@/lib/mapHelpers';
import { MapController } from './MapController';

// Fix Leaflet Default Icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

export const MapView = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [beekeepers, setBeekeepers] = useState<Beekeeper[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLocation = () => {
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation wird von deinem Browser nicht unterstützt');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([
          position.coords.latitude,
          position.coords.longitude
        ]);
      },
      (error) => {
        console.error('Standort-Fehler:', error);
        setLocationError('Standort konnte nicht ermittelt werden. Bitte erlaube den Zugriff.');
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    const fetchBeekeepers = async () => {
      try {
        const response = await fetch('/api/beekeepers');
        if (!response.ok) throw new Error('Fehler beim Laden der Imker');
        const data = await response.json();
        setBeekeepers(data);
      } catch (error) {
        console.error('Fehler:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBeekeepers();
  }, []);

  return (
    <div className="relative h-screen w-full">
      {loading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-amber-50">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🍯</div>
            <p className="text-lg text-amber-800">Lade Imker...</p>
          </div>
        </div>
      )}

      <MapContainer
        center={AUSTRIA_BOUNDS.center}
        zoom={AUSTRIA_BOUNDS.zoom}
        className="h-full w-full"
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
                <h3 className="font-bold text-blue-600">📍 Dein Standort</h3>
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
                  {bk.logo && (
                    <img 
                      src={bk.logo} 
                      alt={bk.name}
                      className="w-16 h-16 object-cover rounded-full mx-auto mb-2"
                    />
                  )}
                  <h3 className="font-bold text-lg text-amber-800">{bk.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{bk.address}, {bk.city}</p>
                  
                  {distance && (
                    <p className="text-xs text-blue-600 font-semibold mb-2">
                      📏 {formatDistance(distance)} entfernt
                    </p>
                  )}
                  
                  {bk.honeyTypes.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700">🍯 Honigsorten:</p>
                      <p className="text-xs text-gray-600">{bk.honeyTypes.join(', ')}</p>
                    </div>
                  )}
                  
                  {bk.phone && (
                    <p className="text-xs text-gray-600">📞 {bk.phone}</p>
                  )}
                  
                  <a 
                    href={`/imker/${bk.id}`}
                    className="mt-2 block text-center bg-amber-500 text-white px-3 py-1 rounded text-sm hover:bg-amber-600 transition"
                  >
                    Details ansehen
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <button
        onClick={requestLocation}
        disabled={loading}
        className="absolute bottom-6 right-6 z-[1000] bg-white p-4 rounded-full shadow-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="Meinen Standort nutzen"
      >
        <span className="text-2xl">📍</span>
      </button>

      {locationError && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p className="text-sm">{locationError}</p>
        </div>
      )}

      <div className="absolute top-6 left-6 z-[1000] bg-white p-4 rounded-lg shadow-lg max-w-xs">
        <h3 className="font-bold text-amber-800 mb-2">🍯 Honeypot</h3>
        <p className="text-sm text-gray-600">
          {beekeepers.length} Imker in Österreich
        </p>
        {userLocation && (
          <p className="text-xs text-blue-600 mt-1">
            📍 Standort aktiviert
          </p>
        )}
      </div>
    </div>
  );
};
