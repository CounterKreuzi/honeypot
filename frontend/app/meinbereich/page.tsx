'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { beekeepersApi } from '@/lib/api/beekeepers';
import type { Beekeeper, HoneyType } from '@/types/api';

export default function MeinBereichPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Beekeeper | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  // Honey types
  const [honeyTypes, setHoneyTypes] = useState<HoneyType[]>([]);
  const [newHoneyName, setNewHoneyName] = useState('');
  const [newHoneyDesc, setNewHoneyDesc] = useState('');
  const [newHoneyPrice, setNewHoneyPrice] = useState('');
  const [newHoneyUnit, setNewHoneyUnit] = useState('');
  const [newHoneyAvailable, setNewHoneyAvailable] = useState(true);

  const isAuthed = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    if (!isAuthed) {
      router.replace('/login');
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const me = await beekeepersApi.getMyProfile();
        setProfile(me);
        setName(me.name || '');
        setDescription(me.description || '');
        setAddress(me.address || '');
        setCity(me.city || '');
        setPostalCode(me.postalCode || '');
        setPhone(me.phone || '');
        setWebsite(me.website || '');
        setHoneyTypes(me.honeyTypes || []);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Fehler beim Laden deines Profils');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthed, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const updated = await beekeepersApi.updateProfile({
        name: name || undefined,
        description: description || undefined,
        address: address || undefined,
        city: city || undefined,
        postalCode: postalCode || undefined,
        phone: phone || undefined,
        website: website || undefined,
      });
      setProfile(updated);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoney = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoneyName.trim()) return;
    try {
      const priceNumber = newHoneyPrice.trim() ? parseFloat(newHoneyPrice) : undefined;
      await beekeepersApi.addHoneyType({
        name: newHoneyName.trim(),
        description: newHoneyDesc || undefined,
        price: priceNumber ?? null,
        unit: newHoneyUnit || undefined,
        available: newHoneyAvailable,
      });
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
      setNewHoneyName('');
      setNewHoneyDesc('');
      setNewHoneyPrice('');
      setNewHoneyUnit('');
      setNewHoneyAvailable(true);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Hinzufügen der Honigsorte');
    }
  };

  const toggleHoneyAvailability = async (h: HoneyType) => {
    try {
      await beekeepersApi.updateHoneyType(h.id, { available: !h.available });
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Aktualisieren');
    }
  };

  const deleteHoney = async (h: HoneyType) => {
    try {
      await beekeepersApi.deleteHoneyType(h.id);
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Löschen');
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      router.push('/');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-yellow-50">
        <div className="bg-white rounded-lg shadow p-6">Lade Bereich…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mein Bereich</h1>
            {profile?.name && (
              <p className="text-gray-600">{profile.name}</p>
            )}
          </div>
          <button onClick={logout} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
            Abmelden
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stammdaten */}
          <section className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Stammdaten</h2>
            <form className="space-y-4" onSubmit={handleSaveProfile}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Firmenname</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stadt</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                  <label className="block text-sm font-medium text-gray-700">Telefon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md disabled:opacity-50"
                >
                  {saving ? 'Speichern…' : 'Speichern'}
                </button>
              </div>
            </form>
          </section>

          {/* Honigsorten */}
          <section className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Honigsorten</h2>
            <form className="space-y-3 mb-4" onSubmit={handleAddHoney}>
              <input
                type="text"
                placeholder="Honigsorte (z.B. Blütenhonig)"
                value={newHoneyName}
                onChange={(e) => setNewHoneyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                placeholder="Beschreibung (optional)"
                value={newHoneyDesc}
                onChange={(e) => setNewHoneyDesc(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Preis (z.B. 6.50)"
                  value={newHoneyPrice}
                  onChange={(e) => setNewHoneyPrice(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  placeholder="Einheit (z.B. 500g)"
                  value={newHoneyUnit}
                  onChange={(e) => setNewHoneyUnit(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={newHoneyAvailable}
                    onChange={(e) => setNewHoneyAvailable(e.target.checked)}
                  />
                  verfügbar
                </label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md"
              >
                Hinzufügen
              </button>
            </form>

            <div className="space-y-2">
              {honeyTypes.length === 0 && (
                <div className="text-sm text-gray-600">Noch keine Honigsorten hinzugefügt.</div>
              )}
              {honeyTypes.map((h) => (
                <div key={h.id} className="flex items-center justify-between border border-gray-200 rounded-md p-3">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    {(h.description || h.unit || h.price) && (
                      <div className="text-sm text-gray-600">
                        {h.description ? `${h.description} ` : ''}
                        {h.unit ? `• ${h.unit} ` : ''}
                        {h.price ? `• ${h.price}€` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleHoneyAvailability(h)}
                      className="px-2 py-1 text-xs rounded-md border border-gray-200 hover:bg-gray-50"
                    >
                      {h.available ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => deleteHoney(h)}
                      className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

