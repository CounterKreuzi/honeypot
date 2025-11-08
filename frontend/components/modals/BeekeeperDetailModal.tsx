'use client';

import { useEffect } from 'react';
import { X, MapPin, Phone, Globe, Clock, Euro, Navigation } from 'lucide-react';
import { Beekeeper } from '@/types/api';

interface BeekeeperDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  beekeeper: Beekeeper | null;
}

export default function BeekeeperDetailModal({
  isOpen,
  onClose,
  beekeeper,
}: BeekeeperDetailModalProps) {
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

  if (!isOpen || !beekeeper) return null;

  const hasImage = beekeeper.photo || beekeeper.logo;
  const imageUrl = beekeeper.photo || beekeeper.logo;

  // Google Maps Link
  const getDirectionsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${beekeeper.latitude},${beekeeper.longitude}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
        {/* Header with Image */}
        <div className="relative h-64 bg-gradient-to-br from-amber-100 to-yellow-100">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={beekeeper.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl">🍯</span>
            </div>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors"
            title="Schließen (ESC)"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>

          {/* Distance Badge */}
          {beekeeper.distance !== undefined && (
            <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded-full shadow-lg">
              <span className="text-sm font-semibold text-gray-700">
                📍 {beekeeper.distance} km entfernt
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {/* Title & Description */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {beekeeper.name}
            </h2>
            {beekeeper.description && (
              <p className="text-gray-600 text-lg leading-relaxed">
                {beekeeper.description}
              </p>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Address */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Adresse</h3>
                <p className="text-gray-600">
                  {beekeeper.address}
                  {beekeeper.city && (
                    <>
                      <br />
                      {beekeeper.postalCode} {beekeeper.city}
                    </>
                  )}
                </p>
                <a
                  href={getDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 font-medium mt-2 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  Route berechnen
                </a>
              </div>
            </div>

            {/* Phone */}
            {beekeeper.phone && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Phone className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Telefon</h3>
                  <a
                    href={`tel:${beekeeper.phone}`}
                    className="text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    {beekeeper.phone}
                  </a>
                </div>
              </div>
            )}

            {/* Website */}
            {beekeeper.website && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Globe className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Website</h3>
                  <a
                    href={beekeeper.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 transition-colors break-all"
                  >
                    {beekeeper.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Opening Hours */}
          {beekeeper.openingHours && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="text-xl font-semibold text-gray-900">Öffnungszeiten</h3>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  {beekeeper.openingHours.monday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Montag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.monday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.tuesday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Dienstag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.tuesday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.wednesday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Mittwoch:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.wednesday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.thursday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Donnerstag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.thursday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.friday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Freitag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.friday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.saturday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Samstag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.saturday}</span>
                    </div>
                  )}
                  {beekeeper.openingHours.sunday && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Sonntag:</span>
                      <span className="text-gray-600">{beekeeper.openingHours.sunday}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Honey Types */}
          {beekeeper.honeyTypes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🍯</span>
                <h3 className="text-xl font-semibold text-gray-900">
                  Verfügbare Honigsorten
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {beekeeper.honeyTypes.map((honey) => (
                  <div
                    key={honey.id}
                    className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {honey.name}
                      </h4>
                      {honey.description && (
                        <p className="text-sm text-gray-600">
                          {honey.description}
                        </p>
                      )}
                    </div>
                    {/* Prices by weight */}
                    {(() => {
                      const formatEuro = (n: number) =>
                        n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      const toNumber = (v: any): number | null => {
                        if (v == null) return null;
                        if (typeof v === 'number' && !isNaN(v)) return v;
                        if (typeof v === 'string') {
                          const s = v.trim();
                          if (s.includes('.') && s.includes(',')) {
                            const normalized = s.replace(/\./g, '').replace(',', '.');
                            const n = parseFloat(normalized);
                            return isNaN(n) ? null : n;
                          }
                          if (s.includes(',')) {
                            const n = parseFloat(s.replace(',', '.'));
                            return isNaN(n) ? null : n;
                          }
                          const n = parseFloat(s);
                          return isNaN(n) ? null : n;
                        }
                        return null;
                      };

                      const p250 = toNumber((honey as any).price250);
                      const p500 = toNumber((honey as any).price500);
                      const p1000 = toNumber((honey as any).price1000);

                      if (p250 == null && p500 == null && p1000 == null) return null;

                      return (
                        <div className="text-right ml-4">
                          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm text-gray-700">
                            {p250 != null && (
                              <span>
                                <span className="text-gray-600">250 g – </span>
                                <span className="font-semibold text-amber-700">{formatEuro(p250)} €</span>
                              </span>
                            )}
                            {p500 != null && (
                              <span>
                                <span className="text-gray-600">500 g – </span>
                                <span className="font-semibold text-amber-700">{formatEuro(p500)} €</span>
                              </span>
                            )}
                            {p1000 != null && (
                              <span>
                                <span className="text-gray-600">1000 g – </span>
                                <span className="font-semibold text-amber-700">{formatEuro(p1000)} €</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-200">
            {beekeeper.phone && (
              <a
                href={`tel:${beekeeper.phone}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                Jetzt anrufen
              </a>
            )}
            {beekeeper.website && (
              <a
                href={beekeeper.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Globe className="w-5 h-5" />
                Website besuchen
              </a>
            )}
            <a
              href={getDirectionsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
            >
              <Navigation className="w-5 h-5" />
              Route
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
