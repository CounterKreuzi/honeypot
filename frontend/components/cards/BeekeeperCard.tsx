'use client';

import { Beekeeper } from '@/types/api';
import { MapPin, Phone, Globe } from 'lucide-react';
import Image from 'next/image';

interface BeekeeperCardProps {
  beekeeper: Beekeeper;
  onClick: () => void;
}

export default function BeekeeperCard({ beekeeper, onClick }: BeekeeperCardProps) {
  const hasImage = beekeeper.photo || beekeeper.logo;
  const imageUrl = beekeeper.photo || beekeeper.logo || '/placeholder-honey.jpg';

  // Check if open now (simplified - you can enhance this)
  const isOpenNow = beekeeper.openingHours ? true : false;

  // Format number as Euro price with comma decimals
  const formatEuro = (n: number) =>
    n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Compute minimum price across all available honey types for given weight
  const availableHoneys = Array.isArray(beekeeper.honeyTypes)
    ? beekeeper.honeyTypes.filter(
        (h): h is NonNullable<Beekeeper['honeyTypes']>[number] => Boolean(h) && h.available !== false
      )
    : [];

  const getMinPrice = (
    key: 'price250' | 'price500' | 'price1000'
  ): number | null => {
    const toNumber = (v: unknown): number | null => {
      if (v == null) return null;
      if (typeof v === 'number' && !isNaN(v)) return v;
      if (typeof v === 'string') {
        const s = v.trim();
        // If both separators exist, interpret "," as decimal and "." as thousands
        if (s.includes('.') && s.includes(',')) {
          const normalized = s.replace(/\./g, '').replace(',', '.');
          const n = parseFloat(normalized);
          return isNaN(n) ? null : n;
        }
        // If only comma present, treat comma as decimal
        if (s.includes(',')) {
          const n = parseFloat(s.replace(',', '.'));
          return isNaN(n) ? null : n;
        }
        // Only dot or plain number, parse directly
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
      }
      return null;
    };
    const prices = availableHoneys
      .map((h) => toNumber(h?.[key]))
      .filter((p: number | null): p is number => typeof p === 'number');
    return prices.length ? Math.min(...prices) : null;
  };

  const min250 = getMinPrice('price250');
  const min500 = getMinPrice('price500');
  const min1000 = getMinPrice('price1000');

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group"
    >
      <div className="flex flex-row">
        {/* Image Section */}
        <div className="relative w-32 h-32 sm:w-64 sm:h-auto bg-gradient-to-br from-amber-50 to-yellow-100 flex-shrink-0">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={beekeeper.name}
              fill
              sizes="(max-width: 640px) 8rem, 256px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl">🍯</span>
            </div>
          )}
          {beekeeper.distance !== undefined && (
            <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full shadow-md">
              <span className="text-sm font-semibold text-gray-700">
                {beekeeper.distance} km
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                {beekeeper.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {beekeeper.address}
                  {beekeeper.city && `, ${beekeeper.city}`}
                </span>
              </div>
            </div>
            {isOpenNow && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                Geöffnet
              </span>
            )}
          </div>

          {/* Description */}
          {beekeeper.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {beekeeper.description}
            </p>
          )}

          {/* Honey Types */}
          {beekeeper.honeyTypes.length > 0 && (
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {beekeeper.honeyTypes.slice(0, 3).map((honey) => (
                  <span
                    key={honey.id}
                    className="inline-flex items-center bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1 rounded-full border border-amber-200"
                  >
                    🍯 {honey.name}
                  </span>
                ))}
                {beekeeper.honeyTypes.length > 3 && (
                  <span className="inline-flex items-center bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                    +{beekeeper.honeyTypes.length - 3} weitere
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Price overview by weight */}
          {(min250 != null || min500 != null || min1000 != null) && (
            <div className="mb-3 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
              {min250 != null && (
                <span>
                  <span className="text-gray-600">250 g ab </span>
                  <span className="font-semibold text-amber-600">€ {formatEuro(min250)}</span>
                </span>
              )}
              {min500 != null && (
                <span>
                  <span className="text-gray-600">500 g ab </span>
                  <span className="font-semibold text-amber-600">€ {formatEuro(min500)}</span>
                </span>
              )}
              {min1000 != null && (
                <span>
                  <span className="text-gray-600">1000 g ab </span>
                  <span className="font-semibold text-amber-600">€ {formatEuro(min1000)}</span>
                </span>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {beekeeper.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{beekeeper.phone}</span>
              </div>
            )}
            {beekeeper.website && (
              <div className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                <span className="text-blue-600">Online-Shop</span>
              </div>
            )}
          </div>

          {/* CTA Button */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
              Details anzeigen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
