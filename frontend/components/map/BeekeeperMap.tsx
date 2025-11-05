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
  mapId?: string; // Neue Prop für eindeutige Container-ID
}

export default function BeekeeperMap({
  beekeepers,
  center = [47.5, 13.5],
  zoom = 7,
  onMarkerClick,
  mapId = 'map', // Default ID
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup alte Karte wenn vorhanden
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Warte bis Container im DOM ist
    if (!containerRef.current) return;

    // Initialisiere neue Karte
    try {
      mapRef.current = L.map(containerRef.current).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Füge Marker hinzu
      beekeepers.forEach((beekeeper) => {
        const lat = typeof beekeeper.latitude === 'string' 
          ? parseFloat(beekeeper.latitude) 
          : beekeeper.latitude;
        const lng = typeof beekeeper.longitude === 'string' 
          ? parseFloat(beekeeper.longitude) 
          : beekeeper.longitude;

        if (isNaN(lat) || isNaN(lng)) return;

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

      // Fit bounds wenn Marker vorhanden
      if (markersRef.current.length > 0) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [beekeepers, center, zoom, onMarkerClick, mapId]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full rounded-lg shadow-lg" 
    />
  );
}
