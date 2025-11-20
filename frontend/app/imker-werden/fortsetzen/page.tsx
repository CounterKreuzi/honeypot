'use client';

import { ChangeEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api/errors';

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
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

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
        }
      );
      if (res?.success) {
        setMessage(res.message || 'Registrierung erfolgreich!');
        if (typeof window !== 'undefined' && res?.data?.token) {
          localStorage.setItem('token', res.data.token);
        }
        setTimeout(() => router.push('/meinbereich'), 800);
      } else {
        setError(res?.message || 'Registrierung konnte nicht abgeschlossen werden');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Abschluss der Registrierung'));
    } finally {
      setLoading(false);
    }
  };

  const handleSalutationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSalutation(event.target.value as 'Herr' | 'Frau' | 'Divers' | '');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
      <div className="w-full max-w-2xl md:max-w-3xl xl:max-w-4xl bg-white shadow-lg rounded-xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Imker-Profil anlegen</h1>
        <p className="text-sm text-gray-600 mb-6">Bitte vervollständige deine Stammdaten.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2" role="alert">{error}</div>
        )}
        {message && (
          <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2" role="status">{message}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Abschnitt: Zugangsdaten */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-gray-900">Zugangsdaten</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Passwort*</label>
                <div className="relative mt-1">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 px-2 text-sm text-gray-600"
                    aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword ? 'Verbergen' : 'Anzeigen'}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Mindestens 8 Zeichen.</p>
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Passwort bestätigen*</label>
                <div className="relative mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword2 ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 pr-12"
                    aria-invalid={password2.length > 0 && password !== password2}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword2((v) => !v)}
                    className="absolute inset-y-0 right-2 px-2 text-sm text-gray-600"
                    aria-label={showPassword2 ? 'Passwort verbergen' : 'Passwort anzeigen'}
                  >
                    {showPassword2 ? 'Verbergen' : 'Anzeigen'}
                  </button>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Abschnitt: Stammdaten */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-900">Stammdaten</legend>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div>
                <label htmlFor="salutation" className="block text-sm font-medium text-gray-700">Anrede*</label>
                <select
                  required
                  id="salutation"
                  name="salutation"
                  value={salutation}
                  onChange={handleSalutationChange}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Bitte wählen</option>
                  <option>Herr</option>
                  <option>Frau</option>
                  <option>Divers</option>
                </select>
              </div>
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">Vorname*</label>
                <input
                  type="text"
                  required
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Nachname*</label>
                <input
                  type="text"
                  required
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">Firmenname*</label>
              <input
                type="text"
                required
                id="companyName"
                name="companyName"
                autoComplete="organization"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="shortDescription" className="block text-sm font-medium text-gray-700">Kurzbeschreibung (max. 200 Zeichen)</label>
              <textarea
                maxLength={200}
                id="shortDescription"
                name="shortDescription"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="text-right text-xs text-gray-500">{shortDescription.length}/200</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  placeholder="https://"
                  id="website"
                  name="website"
                  autoComplete="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="phoneCustomer" className="block text-sm font-medium text-gray-700">Telefon für Kunden</label>
                <input
                  type="tel"
                  id="phoneCustomer"
                  name="phoneCustomer"
                  autoComplete="tel"
                  value={phoneCustomer}
                  onChange={(e) => setPhoneCustomer(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse*</label>
              <input
                type="text"
                required
                id="address"
                name="address"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">PLZ*</label>
                <input
                  type="text"
                  required
                  id="postalCode"
                  name="postalCode"
                  autoComplete="postal-code"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">Ort*</label>
                <input
                  type="text"
                  required
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </fieldset>

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
