'use client';

import { Beekeeper } from '@/types/api';
import { MapPin, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface BeekeeperCardProps {
  beekeeper: Beekeeper;
  onClick: () => void;
}

export default function BeekeeperCard({ beekeeper, onClick }: BeekeeperCardProps) {
  const hasImage = beekeeper.photo || beekeeper.logo;
  const imageUrl = beekeeper.photo || beekeeper.logo || '/placeholder-honey.jpg';

  // Hilfsfunktion zur Preisformatierung
  const formatEuro = (n: number) =>
    n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Berechnung des günstigsten Preises für die Anzeige
  const getMinPrice = (): number | null => {
    if (!beekeeper.honeyTypes) return null;
    
    const prices = beekeeper.honeyTypes
      .flatMap((h) => [h.price250, h.price500, h.price1000])
      .map((p) => (typeof p === 'string' ? parseFloat(p.replace(',', '.')) : p))
      .filter((p): p is number => p !== null && !isNaN(p));

    return prices.length ? Math.min(...prices) : null;
  };

  const minPrice = getMinPrice();

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border border-zinc-100 overflow-hidden group"
    >
      <div className="flex flex-row h-32 sm:h-48">
        {/* Bild-Sektion: Festgelegte Breite auf Mobile für horizontales Layout */}
        <div className="relative w-32 sm:w-48 lg:w-64 bg-amber-50 flex-shrink-0 overflow-hidden">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={beekeeper.name}
              fill
              sizes="(max-width: 640px) 128px, 256px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              🍯
            </div>
          )}
        </div>

        {/* Content-Sektion */}
        <div className="flex-1 p-3 sm:p-6 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-sm sm:text-xl font-bold text-zinc-900 truncate group-hover:text-amber-700 transition-colors">
                {beekeeper.name}
              </h3>
              {beekeeper.distance !== undefined && (
                <span className="flex-shrink-0 bg-amber-50 text-amber-700 text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg">
                  {beekeeper.distance} km
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 mt-1 text-zinc-500">
              <MapPin size={12} className="sm:w-4 sm:h-4 text-amber-500" />
              <p className="text-[10px] sm:text-sm truncate">
                {beekeeper.city ? `${beekeeper.city}, ` : ''}{beekeeper.address}
              </p>
            </div>

            {/* Beschreibung nur auf Desktop anzeigen */}
            {beekeeper.description && (
              <p className="hidden sm:block text-sm text-zinc-600 mt-3 line-clamp-2">
                {beekeeper.description}
              </p>
            )}
          </div>

          <div className="flex items-end justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                Ab Preis
              </span>
              <span className="text-sm sm:text-lg font-black text-amber-600">
                {minPrice ? `€ ${formatEuro(minPrice)}` : 'Auf Anfrage'}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-amber-600 font-bold text-[10px] sm:text-sm group-hover:translate-x-1 transition-transform">
              <span>Details</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
