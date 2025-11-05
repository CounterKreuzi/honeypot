'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/api';

// Fix Leaflet default icon issue
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
  mapId?: string;
}

export default function BeekeeperMap({
  beekeepers,
  center = [47.5, 13.0],
  zoom = 6,
  onMarkerClick,
  mapId = 'map',
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup alte Karte
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Warte bis Container im DOM ist
    if (!containerRef.current) return;

    try {
      // Initialisiere Karte
      mapRef.current = L.map(containerRef.current, {
        zoomAnimation: false,
        fadeAnimation: false,
        // ✅ Wichtig: scrollWheelZoom nur in großer Karte
        scrollWheelZoom: mapId === 'map-modal',
        dragging: true, // ✅ Dragging immer erlauben
        touchZoom: true,
        doubleClickZoom: true,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
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

        if (isNaN(lat) || isNaN(lng)) {
          console.warn(`Invalid coordinates for ${beekeeper.name}`);
          return;
        }

        const marker = L.marker([lat, lng]).addTo(mapRef.current!);

        // Popup Content
        const popupContent = `
          <div class="p-2 max-w-xs">
            <h3 class="font-bold text-base mb-1 text-gray-900">${beekeeper.name}</h3>
            ${beekeeper.description ? `<p class="text-xs text-gray-600 mb-2 line-clamp-2">${beekeeper.description.substring(0, 80)}...</p>` : ''}
            ${beekeeper.distance !== undefined ? `<p class="text-xs font-semibold text-amber-600 mb-1">📍 ${beekeeper.distance.toFixed(1)} km entfernt</p>` : ''}
            <p class="text-xs text-gray-700 mt-2">${beekeeper.address}</p>
            ${beekeeper.city ? `<p class="text-xs text-gray-600">${beekeeper.postalCode || ''} ${beekeeper.city}</p>` : ''}
            ${beekeeper.phone ? `<p class="text-xs text-gray-700 mt-1">📞 ${beekeeper.phone}</p>` : ''}
            ${beekeeper.honeyTypes.length > 0 ? `
              <div class="mt-2 pt-2 border-t border-gray-200">
                <p class="text-xs font-semibold text-gray-700">🍯 ${beekeeper.honeyTypes.length} ${beekeeper.honeyTypes.length === 1 ? 'Honigsorte' : 'Honigsorten'}</p>
              </div>
            ` : ''}
            ${onMarkerClick ? `<p class="text-xs text-amber-600 font-medium mt-2 cursor-pointer hover:text-amber-700">→ Details anzeigen</p>` : ''}
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup'
        });

        // ✅ WICHTIG: Click Handler für onMarkerClick
        if (onMarkerClick) {
          marker.on('click', (e) => {
            // Verhindere Event-Bubbling
            L.DomEvent.stopPropagation(e);
            onMarkerClick(beekeeper);
          });
        }

        markersRef.current.push(marker);
      });

      // Auto-fit nur für große Modal-Karte mit vielen Markern
      if (mapId === 'map-modal' && markersRef.current.length > 1) {
        const group = L.featureGroup(markersRef.current);
        mapRef.current.fitBounds(group.getBounds().pad(0.1), {
          animate: false,
          maxZoom: 12, // Nicht zu nah reinzoomen
        });
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
      className="w-full h-full rounded-lg"
      style={{ 
        cursor: mapId === 'map-sidebar-preview' ? 'pointer' : 'grab',
        minHeight: '200px'
      }}
    />
  );
}