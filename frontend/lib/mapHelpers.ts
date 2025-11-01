import L from 'leaflet';
import { Beekeeper, BeekeeperWithDistance } from '@/types/beekeeper';

// Österreich Bounds
export const AUSTRIA_BOUNDS = {
  center: [47.5, 13.5] as [number, number],
  zoom: 7,
  bounds: [
    [46.4, 9.5],   // Südwest
    [49.0, 17.2]   // Nordost
  ] as [[number, number], [number, number]]
};

// Zoom Constraints
const MIN_ZOOM = 9;
const MAX_ZOOM = 14;
const DEFAULT_USER_ZOOM = 12;

export const calculateOptimalBounds = (
  userLocation: [number, number],
  beekeepers: Beekeeper[]
): { center: [number, number]; zoom: number } | null => {
  
  if (beekeepers.length === 0) {
    return {
      center: userLocation,
      zoom: DEFAULT_USER_ZOOM
    };
  }

  const nearestBeekeeper = findNearestBeekeeper(userLocation, beekeepers);
  
  const bounds = L.latLngBounds([
    userLocation,
    [nearestBeekeeper.latitude, nearestBeekeeper.longitude]
  ]);

  const paddedBounds = bounds.pad(0.15);
  const zoom = calculateBoundsZoom(paddedBounds);
  
  return {
    center: paddedBounds.getCenter() as [number, number],
    zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
  };
};

const findNearestBeekeeper = (
  userLocation: [number, number],
  beekeepers: Beekeeper[]
): Beekeeper => {
  return beekeepers.reduce((nearest, current) => {
    const currentDist = calculateDistance(
      userLocation,
      [current.latitude, current.longitude]
    );
    const nearestDist = calculateDistance(
      userLocation,
      [nearest.latitude, nearest.longitude]
    );
    return currentDist < nearestDist ? current : nearest;
  });
};

export const calculateDistance = (
  point1: [number, number],
  point2: [number, number]
): number => {
  const R = 6371;
  const dLat = toRad(point2[0] - point1[0]);
  const dLon = toRad(point2[1] - point1[1]);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1[0])) *
    Math.cos(toRad(point2[0])) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

const calculateBoundsZoom = (bounds: L.LatLngBounds): number => {
  const latDiff = bounds.getNorth() - bounds.getSouth();
  const lngDiff = bounds.getEast() - bounds.getWest();
  const maxDiff = Math.max(latDiff, lngDiff);
  
  if (maxDiff > 5) return 7;
  if (maxDiff > 2) return 9;
  if (maxDiff > 1) return 10;
  if (maxDiff > 0.5) return 11;
  if (maxDiff > 0.2) return 12;
  if (maxDiff > 0.1) return 13;
  return 14;
};

export const getNearbyBeekeepers = (
  userLocation: [number, number],
  beekeepers: Beekeeper[],
  radiusKm: number = 100
): BeekeeperWithDistance[] => {
  return beekeepers
    .map(bk => ({
      ...bk,
      distance: calculateDistance(userLocation, [bk.latitude, bk.longitude])
    }))
    .filter(bk => bk.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};
