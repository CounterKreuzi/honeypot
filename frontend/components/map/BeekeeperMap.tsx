'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Beekeeper } from '@/types/api';

type IconDefaultPrototype = typeof L.Icon.Default.prototype & {
  _getIconUrl?: () => string;
};

delete (L.Icon.Default.prototype as IconDefaultPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface BeekeeperMapProps {
  beekeepers: Beekeeper[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (beekeeper: Beekeeper) => void;
  mapId?: string;
  userLocation?: [number, number];
}

export default function BeekeeperMap({
  beekeepers,
  center = [47.5, 13.5],
  zoom = 7,
  onMarkerClick,
  mapId = 'map',
  userLocation,
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    try {
      mapRef.current = L.map(containerRef.current, {
        zoomAnimation: false,
        fadeAnimation: false,
      }).setView(center, zoom);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      markerLayerRef.current = L.layerGroup().addTo(mapRef.current);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.setView(center, zoom, { animate: false });
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) {
      return;
    }

    markerLayerRef.current.clearLayers();

    const markers: L.Marker[] = [];

    if (userLocation) {
      const userMarker = L.marker(userLocation, {
        icon: L.divIcon({
          className: '',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -9],
          html: `
            <div style="
              width: 18px;
              height: 18px;
              border-radius: 9999px;
              background: #0f172a;
              box-shadow: 0 0 0 4px rgba(0,0,0,0.1);
              border: 2px solid white;
            "></div>
          `,
        }),
      }).bindPopup('<p class="font-semibold">Ihr Standort</p>');

      userMarker.addTo(markerLayerRef.current);
      markers.push(userMarker);
    }

    beekeepers.forEach((beekeeper) => {
      const lat = typeof beekeeper.latitude === 'string'
        ? parseFloat(beekeeper.latitude)
        : beekeeper.latitude;
      const lng = typeof beekeeper.longitude === 'string'
        ? parseFloat(beekeeper.longitude)
        : beekeeper.longitude;

      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: new L.Icon.Default(),
      });

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

      marker.addTo(markerLayerRef.current!);
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      mapRef.current.fitBounds(group.getBounds().pad(0.1), {
        animate: false,
      });
    }

    return () => {
      markers.forEach((marker) => marker.off());
    };
  }, [beekeepers, onMarkerClick, mapId, userLocation]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg shadow-lg"
    />
  );
}
