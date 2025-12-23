'use client';

import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/api';

// Korrektur für Leaflet Icons in Next.js
type IconDefaultPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: () => string;
};

delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BeekeeperMapProps {
  beekeepers: Beekeeper[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (beekeeper: Beekeeper) => void;
  userLocation?: [number, number];
  isMobile?: boolean; // Neu: Für mobile Optimierungen
}

export default function BeekeeperMap({
  beekeepers,
  center = [47.5, 13.5],
  zoom = 7,
  onMarkerClick,
  userLocation,
  isMobile = false,
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hilfsfunktion für den günstigsten Preis im Tooltip/Popup
  const getLowestPrice = useCallback((beekeeper: Beekeeper) => {
    const prices = beekeeper.honeyTypes
      ?.flatMap((h) => [h.price250, h.price500, h.price1000])
      .map((p) => (typeof p === 'string' ? parseFloat(p.replace(',', '.')) : p))
      .filter((p): p is number => p !== null && !isNaN(p)) || [];

    return prices.length > 0 ? Math.min(...prices) : null;
  }, []);

  // HTML-Inhalt für das Popup/Tooltip bauen
  const buildPopupContent = useCallback((beekeeper: Beekeeper) => {
    const lowestPrice = getLowestPrice(beekeeper);
    return `
      <div class="p-1">
        <h3 class="font-bold text-gray-900">${beekeeper.name}</h3>
        <p class="text-xs text-gray-600 mb-2">${beekeeper.city || ''} ${beekeeper.address}</p>
        <div class="flex items-center justify-between gap-4 mt-2">
          ${lowestPrice ? `<span class="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">ab €${lowestPrice.toFixed(2)}</span>` : ''}
          <span class="text-[10px] text-zinc-400">Details anzeigen →</span>
        </div>
      </div>
    `;
  }, [getLowestPrice]);

  // Initialisierung der Karte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomAnimation: true,
      scrollWheelZoom: false, // Verhindert Zoomen beim Scrollen der Seite
      dragging: !isMobile,    // Verhindert Ein-Finger-Dragging auf Mobile
      touchZoom: true,
      tap: !isMobile
    }).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapRef.current);

    markerLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [isMobile]); // Re-Initialisierung wenn isMobile wechselt

  // Marker aktualisieren
  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;

    markerLayerRef.current.clearLayers();
    const bounds = L.latLngBounds([]);

    // Nutzerstandort einzeichnen
    if (userLocation) {
      const userMarker = L.circleMarker(userLocation, {
        radius: 8,
        fillColor: '#3b82f6',
        color: 'white',
        weight: 3,
        fillOpacity: 1
      }).addTo(markerLayerRef.current);
      userMarker.bindPopup('Ihr Standort');
      bounds.extend(userLocation);
    }

    // Imker-Marker einzeichnen
    beekeepers.forEach((bk) => {
      if (!bk.latitude || !bk.longitude) return;
      
      const pos: [number, number] = [Number(bk.latitude), Number(bk.longitude)];
      const marker = L.marker(pos).addTo(markerLayerRef.current!);
      
      marker.bindPopup(buildPopupContent(bk), {
        closeButton: false,
        className: 'custom-popup'
      });

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(bk));
      }

      bounds.extend(pos);
    });

    // Karte an Marker anpassen, falls welche vorhanden sind
    if (beekeepers.length > 0) {
      mapRef.current.fitBounds(bounds.pad(0.1), { animate: true });
    }
  }, [beekeepers, userLocation, buildPopupContent, onMarkerClick]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px] z-10" />
  );
}
