'use client';

import { Beekeeper } from '@/types/api';
import { MapPin, Phone, Globe, Clock, Star } from 'lucide-react';
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden group"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        <div className="relative w-full sm:w-64 h-48 sm:h-auto bg-gradient-to-br from-amber-50 to-yellow-100 flex-shrink-0">
          {hasImage ? (
            <img
              src={imageUrl}
              alt={beekeeper.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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

          {/* Price Range */}
          {beekeeper.honeyTypes.some((h) => h.price) && (
            <div className="mb-3">
              <span className="text-sm text-gray-600">Ab </span>
              <span className="text-lg font-bold text-amber-600">
                €
                {Math.min(
                  ...beekeeper.honeyTypes
                    .filter((h) => h.price)
                    .map((h) => parseFloat(h.price!))
                )}
              </span>
              <span className="text-sm text-gray-600"> pro Glas</span>
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