import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Beekeeper } from '@/types/beekeeper';
import { calculateOptimalBounds, AUSTRIA_BOUNDS } from '@/lib/mapHelpers';

interface MapControllerProps {
  userLocation: [number, number] | null;
  beekeepers: Beekeeper[];
}

export const MapController = ({ userLocation, beekeepers }: MapControllerProps) => {
  const map = useMap();

  useEffect(() => {
    if (userLocation && beekeepers.length > 0) {
      const optimal = calculateOptimalBounds(userLocation, beekeepers);
      
      if (optimal) {
        map.flyTo(optimal.center, optimal.zoom, {
          duration: 1.5,
          easeLinearity: 0.25
        });
      }
    } else if (userLocation && beekeepers.length === 0) {
      map.flyTo(userLocation, 12, {
        duration: 1.5
      });
    } else if (!userLocation) {
      map.flyToBounds(AUSTRIA_BOUNDS.bounds, {
        padding: [50, 50],
        duration: 1.5
      });
    }
  }, [userLocation, beekeepers, map]);

  return null;
};
