'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useBeekeeperStore } from '@/lib/store/beekeeperStore';
import { beekeepersApi } from '@/lib/api/beekeepers';
import { Beekeeper } from '@/types/api';

const BeekeeperMap = dynamic(() => import('@/components/map/BeekeeperMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <p className="text-gray-600">Karte wird geladen...</p>
    </div>
  ),
});

export default function Home() {
  const { beekeepers, setBeekeepers, setSelectedBeekeeper, loading, setLoading, setError } =
    useBeekeeperStore();
  const [selectedBeekeeperDetail, setSelectedBeekeeperDetail] = useState<Beekeeper | null>(null);

  useEffect(() => {
    loadBeekeepers();
  }, []);

  const loadBeekeepers = async () => {
    try {
      setLoading(true);
      const data = await beekeepersApi.getAll();
      setBeekeepers(data);
      setError(null);
    } catch (error) {
      console.error('Failed to load beekeepers:', error);
      setError('Fehler beim Laden der Imker');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (beekeeper: Beekeeper) => {
    setSelectedBeekeeper(beekeeper);
    setSelectedBeekeeperDetail(beekeeper);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🍯</span>
              <h1 className="text-2xl font-bold text-amber-900">Honeypot</h1>
            </div>
            <p className="text-gray-600 hidden sm:block">Finde lokale Imker in deiner Nähe</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">📊 Statistik</h2>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-bold text-amber-600">{beekeepers.length}</span> Imker registriert
                </p>
                <p className="text-gray-600">
                  <span className="font-bold text-amber-600">
                    {beekeepers.reduce((sum, b) => sum + b.honeyTypes.length, 0)}
                  </span>{' '}
                  Honigsorten verfügbar
                </p>
              </div>
            </div>

            {selectedBeekeeperDetail && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">
                  🍯 {selectedBeekeeperDetail.name}
                </h2>
                {selectedBeekeeperDetail.description && (
                  <p className="text-gray-600 text-sm mb-4">
                    {selectedBeekeeperDetail.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                    �� {selectedBeekeeperDetail.address}
                    {selectedBeekeeperDetail.city && `, ${selectedBeekeeperDetail.city}`}
                  </p>
                  {selectedBeekeeperDetail.phone && (
                    <p className="text-gray-700">📞 {selectedBeekeeperDetail.phone}</p>
                  )}
                  {selectedBeekeeperDetail.website && (
                    <p className="text-gray-700">
                      🌐{' '}
                      
                        <a href={selectedBeekeeperDetail.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:underline"
                      >
                        Website
                      </a>
                    </p>
                  )}
                </div>

                {selectedBeekeeperDetail.honeyTypes.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Honigsorten:</h3>
                    <ul className="space-y-2">
                      {selectedBeekeeperDetail.honeyTypes.map((honey) => (
                        <li key={honey.id} className="text-sm">
                          <span className="font-medium">{honey.name}</span>
                          {honey.price && (
                            <span className="text-amber-600 ml-2">
                              €{honey.price} / {honey.unit}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">🗺️ Imker in deiner Nähe</h2>
              {loading ? (
                <div className="h-[600px] flex items-center justify-center bg-gray-100 rounded-lg">
                  <p className="text-gray-600">Lade Imker...</p>
                </div>
              ) : (
                <div className="h-[600px]">
                  <BeekeeperMap beekeepers={beekeepers} onMarkerClick={handleMarkerClick} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
