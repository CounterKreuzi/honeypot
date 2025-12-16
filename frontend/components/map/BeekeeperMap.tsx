'use client';

import { useCallback, useEffect, useRef } from 'react';
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
  showPopups?: boolean;
  activeBeekeeperIds?: string[];
  invalidateSizeKey?: unknown;
}

export default function BeekeeperMap({
  beekeepers,
  center = [47.5, 13.5],
  zoom = 7,
  onMarkerClick,
  mapId = 'map',
  userLocation,
  showPopups = true,
  activeBeekeeperIds,
  invalidateSizeKey,
}: BeekeeperMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousUserLocationRef = useRef<[number, number] | undefined>();
  const previousCenterRef = useRef<[number, number] | null>(null);
  const previousZoomRef = useRef<number | null>(null);
  const previousFitSignatureRef = useRef('');

  const getLowestPrice = useCallback((beekeeper: Beekeeper) => {
    const normalizePrice = (
      price: number | string | null | undefined
    ): number | null => {
      if (price === null || price === undefined) return null;

      if (typeof price === 'string') {
        const parsed = parseFloat(price.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
      }

      return Number.isFinite(price) ? price : null;
    };

    const prices = beekeeper.honeyTypes
      .flatMap((honey) => [honey.price250, honey.price500, honey.price1000])
      .map(normalizePrice)
      .filter((price): price is number => price !== null);

    if (prices.length === 0) return null;
    return Math.min(...prices);
  }, []);

  const buildTooltipContent = useCallback(
    (beekeeper: Beekeeper) => {
    const heroImage = beekeeper.photo || beekeeper.logo || beekeeper.honeyTypes[0]?.image;
    const lowestPrice = getLowestPrice(beekeeper);
    const honeyCount = beekeeper.honeyTypes.length;

    return `
      <div class="beekeeper-tooltip-card">
        <div class="beekeeper-tooltip-image" style="${
          heroImage
            ? `background-image: url('${heroImage}');`
            : 'background-image: linear-gradient(135deg, #f7e9c4 0%, #f1d284 100%);'
        }"></div>
        <div class="beekeeper-tooltip-content">
          <div class="beekeeper-tooltip-header">
            <span class="beekeeper-badge">${honeyCount > 0 ? `${honeyCount} Sorten` : 'Imker'}</span>
            ${lowestPrice !== null ? `<span class="beekeeper-price">ab €${lowestPrice.toFixed(2)}</span>` : ''}
          </div>
          <h3 class="beekeeper-tooltip-title">${beekeeper.name}</h3>
          ${beekeeper.distance !== undefined ? `<p class="beekeeper-distance">${beekeeper.distance} km entfernt</p>` : ''}
      <p class="beekeeper-address">${beekeeper.city ? `${beekeeper.city}, ` : ''}${beekeeper.address}</p>
    </div>
  </div>
    `;
    },
    [getLowestPrice]
  );

  // FIX: Dependency Array ist jetzt leer [], damit die Karte nur EINMAL initialisiert wird.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const centerChanged =
      !previousCenterRef.current ||
      previousCenterRef.current[0] !== center[0] ||
      previousCenterRef.current[1] !== center[1];
    const zoomChanged = previousZoomRef.current !== zoom;

    if (centerChanged || zoomChanged) {
      mapRef.current.setView(center, zoom, { animate: false });
      previousCenterRef.current = center;
      previousZoomRef.current = zoom;
    }
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.invalidateSize();
  }, [invalidateSizeKey]);

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
      });

      if (showPopups) {
        userMarker.bindPopup('<p class="font-semibold">Ihr Standort</p>');
      }

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

      const isActive = !activeBeekeeperIds || activeBeekeeperIds.includes(beekeeper.id);

      const marker = L.marker([lat, lng], {
        icon: new L.Icon.Default(),
        opacity: isActive ? 1 : 0.6,
        zIndexOffset: isActive ? 100 : 0,
      });

      if (showPopups) {
        const tooltipContent = buildTooltipContent(beekeeper);
        const tooltip = L.tooltip({
          direction: 'top',
          offset: [0, -10],
          opacity: 1,
          className: 'beekeeper-tooltip',
          interactive: true,
        });

        marker.bindTooltip(tooltipContent, tooltip.options);
        marker.on('mouseover', () => marker.openTooltip());
        marker.on('mouseout', () => marker.closeTooltip());
        marker.bindPopup(tooltipContent, { className: 'beekeeper-tooltip-popup' });
      }

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(beekeeper));
      }

      marker.addTo(markerLayerRef.current!);
      markers.push(marker);
    });

    const userLocationChanged =
      previousUserLocationRef.current?.[0] !== userLocation?.[0] ||
      previousUserLocationRef.current?.[1] !== userLocation?.[1];

    if (userLocationChanged) {
      previousUserLocationRef.current = userLocation;
    }

    const beekeepersToFocus = activeBeekeeperIds
      ? beekeepers.filter((beekeeper) => activeBeekeeperIds.includes(beekeeper.id))
      : beekeepers;

    const fitPoints: [number, number][] = [];

    beekeepersToFocus.forEach((beekeeper) => {
      const lat = typeof beekeeper.latitude === 'string'
        ? parseFloat(beekeeper.latitude)
        : beekeeper.latitude;
      const lng = typeof beekeeper.longitude === 'string'
        ? parseFloat(beekeeper.longitude)
        : beekeeper.longitude;

      if (isNaN(lat) || isNaN(lng)) return;

      fitPoints.push([lat, lng]);
    });

    if (userLocation) {
      fitPoints.push(userLocation);
    }

    const fitSignature = fitPoints
      .map(([lat, lng]) => `${lat.toFixed(5)},${lng.toFixed(5)}`)
      .sort()
      .join('|');

    const shouldFitBounds =
      fitPoints.length > 0 &&
      (userLocationChanged || fitSignature !== previousFitSignatureRef.current);

    if (shouldFitBounds) {
      if (fitPoints.length === 1) {
        mapRef.current.setView(fitPoints[0], Math.max(mapRef.current.getZoom(), 12), {
          animate: false,
        });
      } else {
        const bounds = L.latLngBounds(fitPoints);
        mapRef.current.fitBounds(bounds.pad(0.1), {
          animate: false,
        });
      }

      previousFitSignatureRef.current = fitSignature;
    }

    return () => {
      markers.forEach((marker) => marker.off());
    };
    }, [beekeepers, onMarkerClick, mapId, userLocation, showPopups, activeBeekeeperIds, buildTooltipContent]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg shadow-lg"
    />
  );
}
