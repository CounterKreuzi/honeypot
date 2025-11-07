'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';

function ContinueRegistrationInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Ungültiger Link. Bitte fordere einen neuen an.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await authApi.registerComplete(token, password, name, {
        address: address || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
      });
      if (res?.success) {
        setMessage(res.message || 'Registrierung erfolgreich! Bitte bestätige deine E-Mail.');
        // Optional nach kurzer Zeit zur Login-Seite
        setTimeout(() => router.push('/login'), 2000);
      } else {
        setError(res?.message || 'Registrierung konnte nicht abgeschlossen werden');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Abschluss der Registrierung');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Registrierung fortsetzen</h1>
        <p className="text-sm text-gray-600 mb-6">Lege deinen Namen und ein Passwort fest.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        {message && (
          <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <details className="rounded border border-amber-200 p-3 bg-amber-50">
            <summary className="cursor-pointer text-sm text-amber-800">Optionale Adressangaben</summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PLZ</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ort</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </details>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Sende …' : 'Konto anlegen'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Schon ein Konto?{' '}
          <Link className="text-amber-700 hover:underline" href="/login">Anmelden</Link>
        </p>
      </div>
    </main>
  );
}

export default function ContinueRegistrationPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
          <p className="text-gray-600">Lade Formular …</p>
        </div>
      </main>
    }>
      <ContinueRegistrationInner />
    </Suspense>
  );
}
