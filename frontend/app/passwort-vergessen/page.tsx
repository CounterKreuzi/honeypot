'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await authApi.requestPasswordReset(email);
      setMessage(res?.message || 'Wenn diese E-Mail existiert, wurde ein Link gesendet.');
    } catch (err: any) {
      setMessage('Wenn diese E-Mail existiert, wurde ein Link gesendet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Passwort vergessen</h1>
        <p className="text-sm text-gray-600 mb-6">Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.</p>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}
        {message && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">{message}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Sende Link…' : 'Zurücksetzen-Link senden'}
          </button>
        </form>
        <p className="text-sm text-gray-600 mt-4">
          <Link className="text-amber-700 hover:underline" href="/login">Zurück zum Login</Link>
        </p>
      </div>
    </main>
  );
}

