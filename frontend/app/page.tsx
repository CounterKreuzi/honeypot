import dynamic from 'next/dynamic';

const MapView = dynamic(
  () => import('@/components/Map/MapView').then(mod => ({ default: mod.MapView })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen w-full flex items-center justify-center bg-amber-50">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">��</div>
          <p className="text-lg text-amber-800">Karte wird geladen...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return <MapView />;
}
