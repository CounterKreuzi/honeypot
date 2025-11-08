'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { beekeepersApi } from '@/lib/api/beekeepers';
import type { Beekeeper, HoneyType } from '@/types/api';
import { authApi } from '@/lib/api/auth';

export default function MeinBereichPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Beekeeper | null>(null);
  const [editing, setEditing] = useState(false);

  // Modals for email/password changes
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [emailNew, setEmailNew] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailFlowStep, setEmailFlowStep] = useState<'request' | 'confirm'>('request');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwNew2, setPwNew2] = useState('');

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
      setError(err?.response?.data?.message || 'Fehler beim HinzufÃ¼gen der Honigsorte');
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
      setError(err?.response?.data?.message || 'Fehler beim LÃ¶schen');
    }
  };

  // Email change flow
  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await authApi.requestChangeEmail(emailNew.trim());
      if (res?.success) {
        setEmailFlowStep('confirm');
      } else {
        setError(res?.message || 'Konnte Code nicht senden');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Senden des Codes');
    }
  };

  const handleEmailConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const res = await authApi.confirmChangeEmail(emailCode.trim());
      if (res?.success) {
        setShowEmailModal(false);
        setEmailNew('');
        setEmailCode('');
        // Reload profile
        const me = await beekeepersApi.getMyProfile();
        setProfile(me);
      } else {
        setError(res?.message || 'BestÃ¤tigung fehlgeschlagen');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler bei der BestÃ¤tigung');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwNew || pwNew.length < 8 || pwNew !== pwNew2) {
      setError('Bitte neues Passwort prÃ¼fen (mind. 8 Zeichen, identisch).');
      return;
    }
    try {
      setError(null);
      const res = await authApi.changePassword(pwCurrent, pwNew);
      if (res?.success) {
        setShowPasswordModal(false);
        setPwCurrent(''); setPwNew(''); setPwNew2('');
      } else {
        setError(res?.message || 'Passwort konnte nicht geÃ¤ndert werden');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Passwort Ã¤ndern');
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
        <div className="bg-white rounded-lg shadow p-6">Lade Bereichâ€¦</div>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Stammdaten</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setShowEmailModal(true); setEmailFlowStep('request'); setEmailNew(''); setEmailCode(''); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Eâ€‘Mail-Adresse Ã¤ndern</button>
                <button type="button" onClick={() => setShowPasswordModal(true)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Passwort Ã¤ndern</button>
                <button type="button" onClick={() => setEditing((v) => !v)} className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700">{editing ? 'Abbrechen' : 'Stammdaten bearbeiten'}</button>
              </div>
            </div>

            {!editing && (
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500">Firmenname: </span><span className="text-gray-900 font-medium">{name || 'â€“'}</span></div>
                <div><span className="text-gray-500">Beschreibung: </span><span className="text-gray-900">{description || 'â€“'}</span></div>
                <div><span className="text-gray-500">Adresse: </span><span className="text-gray-900">{address || 'â€“'}</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><span className="text-gray-500">Stadt: </span><span className="text-gray-900">{city || 'â€“'}</span></div>
                  <div><span className="text-gray-500">PLZ: </span><span className="text-gray-900">{postalCode || 'â€“'}</span></div>
                  <div><span className="text-gray-500">Telefon: </span><span className="text-gray-900">{phone || 'â€“'}</span></div>
                </div>
                <div><span className="text-gray-500">Website: </span><span className="text-gray-900">{website || 'â€“'}</span></div>
              </div>
            )}

            {editing && (
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
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PLZ</label>
                  <input
                    type="text"
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
                  <label className="block text-sm font-medium text-gray-700">Telefon</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    autoComplete="tel"
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
                  id="website"
                  name="website"
                  autoComplete="url"
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
                  {saving ? 'Speichernâ€¦' : 'Speichern'}
                </button>
              </div>
            </form>
            )}
          </section>

          {/* Honigsorten */}
          <section className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Honigsorten</h2>
            <form className="space-y-3 mb-4" onSubmit={handleAddHoney}>
              <input
                type="text"
                placeholder="Honigsorte (z.B. BlÃ¼tenhonig)"
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
                  verfÃ¼gbar
                </label>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md"
              >
                HinzufÃ¼gen
              </button>
            </form>

            <div className="space-y-2">
              {honeyTypes.length === 0 && (
                <div className="text-sm text-gray-600">Noch keine Honigsorten hinzugefÃ¼gt.</div>
              )}
              {honeyTypes.map((h) => (
                <div key={h.id} className="flex items-center justify-between border border-gray-200 rounded-md p-3">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    {(h.description || h.unit || h.price) && (
                      <div className="text-sm text-gray-600">
                        {h.description ? `${h.description} ` : ''}
                        {h.unit ? `â€¢ ${h.unit} ` : ''}
                        {h.price ? `â€¢ ${h.price}â‚¬` : ''}
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
                      LÃ¶schen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        {/* Modals */}
        <Modal open={showEmailModal} title="Eâ€‘Mail-Adresse Ã¤ndern" onClose={() => setShowEmailModal(false)}>
          {emailFlowStep === 'request' ? (
            <form className="space-y-3" onSubmit={handleEmailRequest}>
              <label className="block text-sm font-medium text-gray-700">Neue Eâ€‘Mail-Adresse</label>
              <input
                type="email"
                autoComplete="email"
                value={emailNew}
                onChange={(e) => setEmailNew(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Code senden</button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleEmailConfirm}>
              <p className="text-sm text-gray-600">Wir haben dir einen Code an deine aktuelle Eâ€‘Mail gesendet.</p>
              <label className="block text-sm font-medium text-gray-700">BestÃ¤tigungscode</label>
              <input
                type="text"
                inputMode="numeric"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Eâ€‘Mail Ã¤ndern</button>
            </form>
          )}
        </Modal>

        <Modal open={showPasswordModal} title="Passwort Ã¤ndern" onClose={() => setShowPasswordModal(false)}>
          <form className="space-y-3" onSubmit={handleChangePassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aktuelles Passwort</label>
              <input
                type="password"
                autoComplete="current-password"
                value={pwCurrent}
                onChange={(e) => setPwCurrent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Neues Passwort</label>
              <input
                type="password"
                autoComplete="new-password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Neues Passwort bestÃ¤tigen</label>
              <input
                type="password"
                autoComplete="new-password"
                value={pwNew2}
                onChange={(e) => setPwNew2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
                minLength={8}
              />
            </div>
            <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Passwort speichern</button>
          </form>
        </Modal>
      </div>
    </main>
  );
}
// Simple modal component
function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900">Schließen</button>
        </div>
        {children}
      </div>
    </div>
  );
}












