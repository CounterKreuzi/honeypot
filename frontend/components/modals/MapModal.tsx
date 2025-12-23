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
  userLocation?: [number, number];
  activeBeekeeperIds?: string[];
  previewBeekeeper?: Beekeeper | null;
  onPreviewClose?: () => void;
  onPreviewDetails?: (beekeeper: Beekeeper) => void;
}

export default function MapModal({
  isOpen,
  onClose,
  beekeepers,
  onMarkerClick,
  center,
  zoom,
  userLocation,
  activeBeekeeperIds,
  previewBeekeeper,
  onPreviewClose,
  onPreviewDetails,
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
    // ✅ FIX: z-[9999] statt z-50 für höchste Priorität
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full h-full md:w-[95vw] md:h-[95vh] md:rounded-lg overflow-hidden bg-white shadow-2xl z-[10000]">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[10001] bg-white shadow-md px-4 py-3 flex items-center justify-between">
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
          <BeekeeperMap
            beekeepers={beekeepers}
            onMarkerClick={onMarkerClick}
            center={center}
            zoom={zoom}
            mapId="map-modal"
            userLocation={userLocation}
            activeBeekeeperIds={activeBeekeeperIds}
          />
        </div>

        {previewBeekeeper && (
          <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:max-w-sm pointer-events-none z-[10002]">
            <div className="pointer-events-auto bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-amber-100 overflow-hidden">
              <div className="flex items-center justify-between gap-3 p-4 border-b border-amber-50">
                <div>
                  <p className="text-xs font-semibold text-amber-700">Imker Vorschau</p>
                  <h3 className="text-base font-bold text-gray-900">{previewBeekeeper.name}</h3>
                  {previewBeekeeper.distance !== undefined && (
                    <p className="text-sm text-gray-600">{previewBeekeeper.distance} km entfernt</p>
                  )}
                </div>
                <button
                  onClick={onPreviewClose}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                >
                  Schließen
                </button>
              </div>
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                  {previewBeekeeper.honeyTypes.slice(0, 2).map((honey) => honey.name).join(', ')}
                </div>
                <button
                  onClick={() => onPreviewDetails?.(previewBeekeeper)}
                  className="px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold shadow hover:bg-amber-600 transition-colors"
                >
                  Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
