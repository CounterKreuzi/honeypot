'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api/errors';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Ungültiger Link.');
        setLoading(false);
        return;
      }
      try {
        const res = await authApi.verifyEmail(token);
        if (res?.success) {
          setStatus('success');
          setMessage(res.message || 'E-Mail erfolgreich verifiziert!');
        } else {
          setStatus('error');
          setMessage(res?.message || 'Verifizierung fehlgeschlagen');
        }
      } catch (err: unknown) {
        setStatus('error');
        setMessage(getApiErrorMessage(err, 'Verifizierung fehlgeschlagen'));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">E-Mail bestätigen</h1>
        {loading && <p className="text-gray-600">Bitte warten …</p>}
        {!loading && (
          <>
            <p className={`mb-4 ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message}</p>
            <div className="space-x-4">
              <Link href="/login" className="text-amber-700 hover:underline">Zum Login</Link>
              <Link href="/" className="text-gray-700 hover:underline">Zur Startseite</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50 px-4">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 text-center">
          <p className="text-gray-600">Verifiziere …</p>
        </div>
      </main>
    }>
      <VerifyEmailInner />
    </Suspense>
  );
}
