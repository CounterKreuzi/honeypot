'use client';

import { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { Beekeeper } from '@/types/api';
import dynamic from 'next/dynamic';

const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <p className="text-gray-600">Karte wird geladen...</p>
    </div>
  ),
});

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  beekeepers: Beekeeper[];
  onMarkerClick?: (beekeeper: Beekeeper) => void;
  center?: [number, number];
  zoom?: number;
}

export default function MapModal({
  isOpen,
  onClose,
  beekeepers,
  onMarkerClick,
  center,
  zoom,
}: MapModalProps) {
  // Close modal on ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full h-full md:w-[95vw] md:h-[95vh] md:rounded-lg overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Kartenansicht - {beekeepers.length} Imker
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Schließen (ESC)"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Map */}
        <div className="w-full h-full pt-16">
          {/* WICHTIG: Eindeutige mapId für Modal */}
          <BeekeeperMap
            beekeepers={beekeepers}
            onMarkerClick={onMarkerClick}
            center={center}
            zoom={zoom}
            mapId="map-modal"  {/* Eindeutige ID! */}
          />
        </div>
      </div>
    </div>
  );
}
