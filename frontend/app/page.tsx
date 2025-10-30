export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          �� Honeypot - Imker Plattform
        </h1>
        <p className="text-gray-600 mb-8">
          Finde lokale Imker in deiner Nähe
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Für Konsumenten</h2>
            <p className="text-gray-600">
              Entdecke Imker und kaufe regionalen Honig
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Für Imker</h2>
            <p className="text-gray-600">
              Registriere dich und präsentiere deine Produkte
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
