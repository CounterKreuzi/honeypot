'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/api';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BeekeeperMapProps {
  beekeepers: Beekeeper[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (beekeeper: Beekeeper) => void;
}

export default function BeekeeperMap({
  beekeepers,
  center = [48.2082, 16.3738],
  zoom = 13,
  onMarkerClick,
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    beekeepers.forEach((beekeeper) => {
      const lat = typeof beekeeper.latitude === 'string' 
        ? parseFloat(beekeeper.latitude) 
        : beekeeper.latitude;
      const lng = typeof beekeeper.longitude === 'string' 
        ? parseFloat(beekeeper.longitude) 
        : beekeeper.longitude;

      const marker = L.marker([lat, lng]).addTo(mapRef.current!);

      const popupContent = `
        <div class="p-2">
          <h3 class="font-bold text-lg mb-1">${beekeeper.name}</h3>
          ${beekeeper.description ? `<p class="text-sm text-gray-600 mb-2">${beekeeper.description.substring(0, 100)}...</p>` : ''}
          ${beekeeper.distance !== undefined ? `<p class="text-sm font-semibold text-amber-600">📍 ${beekeeper.distance} km entfernt</p>` : ''}
          <p class="text-sm mt-2">${beekeeper.address}, ${beekeeper.city || ''}</p>
          ${beekeeper.phone ? `<p class="text-sm">📞 ${beekeeper.phone}</p>` : ''}
          ${beekeeper.honeyTypes.length > 0 ? `<p class="text-sm mt-2 font-semibold">🍯 ${beekeeper.honeyTypes.length} Honigsorten</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(beekeeper));
      }

      markersRef.current.push(marker);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [beekeepers, center, zoom, onMarkerClick]);

  return <div id="map" className="w-full h-full rounded-lg shadow-lg" />;
}
