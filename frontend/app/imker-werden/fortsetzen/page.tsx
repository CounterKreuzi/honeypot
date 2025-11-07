'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';

function ContinueRegistrationInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [salutation, setSalutation] = useState<'Herr' | 'Frau' | 'Divers' | ''>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [phoneCustomer, setPhoneCustomer] = useState('');
  const [phoneAdmin, setPhoneAdmin] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
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
      if (password !== password2) {
        setError('Passwörter stimmen nicht überein');
        setLoading(false);
        return;
      }
      const res = await authApi.registerComplete(
        token,
        password,
        companyName || `${firstName} ${lastName}`.trim(),
        {
          address,
          city,
          postalCode,
          salutation,
          firstName,
          lastName,
          companyName,
          shortDescription,
          website,
          phoneCustomer,
          phoneAdmin,
        }
      );
      if (res?.success) {
        setMessage(res.message || 'Registrierung erfolgreich!');
        // Automatisch einloggen und zum Profil leiten
        if (typeof window !== 'undefined' && res?.data?.token) {
          localStorage.setItem('token', res.data.token);
        }
        setTimeout(() => router.push('/meinbereich'), 800);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Imker Profil anlegen</h1>
        <p className="text-sm text-gray-600 mb-6">Bitte vervollständige deine Stammdaten.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        {message && (
          <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Anrede*</label>
              <select
                required
                value={salutation}
                onChange={(e) => setSalutation(e.target.value as any)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Bitte wählen</option>
                <option>Herr</option>
                <option>Frau</option>
                <option>Divers</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vorname*</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nachname*</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Firmenname*</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Kurzbeschreibung (max. 200 Zeichen)</label>
            <textarea
              maxLength={200}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="text-right text-xs text-gray-500">{shortDescription.length}/200</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Website</label>
              <input
                type="url"
                placeholder="https://"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefon für Kunden</label>
              <input
                type="tel"
                value={phoneCustomer}
                onChange={(e) => setPhoneCustomer(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon für Organisatorisches (optional)</label>
            <input
              type="tel"
              value={phoneAdmin}
              onChange={(e) => setPhoneAdmin(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Adresse*</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">PLZ*</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ort*</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Passwort*</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passwort bestätigen*</label>
              <input
                type="password"
                required
                minLength={8}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !token || password !== password2}
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
