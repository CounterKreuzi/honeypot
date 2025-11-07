'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res?.success && res?.data?.token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', res.data.token);
        }
        router.push('/meinbereich');
      } else {
        setError(res?.message || 'Login fehlgeschlagen');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Anmelden</h1>
        <p className="text-sm text-gray-600 mb-6">Melde dich an, um dein Imker-Profil zu verwalten.</p>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Passwort</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>
        <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
          <Link className="text-amber-700 hover:underline" href="/passwort-vergessen">
            Passwort vergessen?
          </Link>
          <span>
            Noch kein Konto?{' '}
            <Link className="text-amber-700 hover:underline" href="/imker-werden">
              Imker werden
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
