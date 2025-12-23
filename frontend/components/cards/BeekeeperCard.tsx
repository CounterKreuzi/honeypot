'use client';

import { Beekeeper } from '@/types/api';
import { MapPin, Phone, Globe } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

interface BeekeeperCardProps {
  beekeeper: Beekeeper;
  onClick: () => void;
}

export default function BeekeeperCard({ beekeeper, onClick }: BeekeeperCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const hasImage = beekeeper.photo || beekeeper.logo;
  const imageUrl = beekeeper.photo || beekeeper.logo || '/placeholder-honey.jpg';

  const getTodayKey = () => {
    const dayIndex = new Date().getDay();
    const dayKeys: Array<keyof NonNullable<Beekeeper['openingHours']>> = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];
    return dayKeys[dayIndex];
  };

  const parseTimeToMinutes = (time: string): number | null => {
    const match = time.trim().match(/(\d{1,2})[:.](\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const getOpeningStatus = () => {
    if (!beekeeper.openingHours) {
      return { isOpenNow: false, isClosingSoon: false };
    }

    const todayKey = getTodayKey();
    const todaysHours = beekeeper.openingHours[todayKey];
    if (!todaysHours) {
      return { isOpenNow: false, isClosingSoon: false };
    }

    const lowerHours = todaysHours.toLowerCase();
    if (lowerHours.includes('geschlossen')) {
      return { isOpenNow: false, isClosingSoon: false };
    }

    const times = todaysHours.match(/(\d{1,2}[:.]\d{2})/g);
    if (!times || times.length < 2) {
      return { isOpenNow: false, isClosingSoon: false };
    }

    const openMinutes = parseTimeToMinutes(times[0]);
    const closeMinutes = parseTimeToMinutes(times[times.length - 1]);
    if (openMinutes === null || closeMinutes === null || closeMinutes <= openMinutes) {
      return { isOpenNow: false, isClosingSoon: false };
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const isOpenNow = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    const minutesToClose = closeMinutes - nowMinutes;

    return {
      isOpenNow,
      isClosingSoon: isOpenNow && minutesToClose <= 30,
    };
  };

  const { isOpenNow, isClosingSoon } = getOpeningStatus();

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
  const priceOptions = [
    { size: 250, price: min250 },
    { size: 500, price: min500 },
    { size: 1000, price: min1000 },
  ].filter((option): option is { size: number; price: number } => option.price != null);
  const baseOption = priceOptions.reduce<{ size: number; price: number } | null>(
    (cheapest, option) => {
      if (!cheapest || option.price < cheapest.price) {
        return option;
      }
      return cheapest;
    },
    null
  );

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <div className="relative w-full sm:w-64 aspect-[4/3] sm:aspect-[3/4] bg-gradient-to-br from-amber-50 to-yellow-100 flex-shrink-0">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={beekeeper.name}
              fill
              sizes="(max-width: 640px) 100vw, 256px"
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
        <div className="flex-1 p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
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
            {isClosingSoon ? (
              <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full">
                Schließt bald
              </span>
            ) : (
              isOpenNow && (
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                  Geöffnet
                </span>
              )
            )}
          </div>
          <button
            type="button"
            className="sm:hidden inline-flex items-center text-amber-700 text-sm font-semibold underline underline-offset-4 w-fit"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails((prev) => !prev);
            }}
            aria-expanded={showDetails}
          >
            {showDetails ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>

          <div className={`${showDetails ? 'flex' : 'hidden'} sm:flex flex-col gap-3`}>
            {/* Description */}
            {beekeeper.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {beekeeper.description}
              </p>
            )}

            {/* Honey Types */}
            {beekeeper.honeyTypes.length > 0 && (
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
            )}

            {/* Price overview by weight */}
            {baseOption && (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600">
                    ab € {formatEuro(baseOption.price)}
                  </span>
                  <span className="text-xs text-gray-500">für {baseOption.size} g</span>
                </div>
                {priceOptions.length > 1 && (
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    {priceOptions.map((option) => (
                      <span key={option.size}>
                        {option.size} g · € {formatEuro(option.price)}
                      </span>
                    ))}
                  </div>
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
          </div>

          {/* CTA Button */}
          <div className="pt-3 border-t border-gray-100">
            <button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
              Details anzeigen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
