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

  // Modals (email/password)
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
  const [newHoneyPrice250, setNewHoneyPrice250] = useState('');
  const [newHoneyPrice500, setNewHoneyPrice500] = useState('');
  const [newHoneyPrice1000, setNewHoneyPrice1000] = useState('');
  const [newHoneyAvailable, setNewHoneyAvailable] = useState(true);

  // Edit honey modal state
  const [editingHoney, setEditingHoney] = useState<HoneyType | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice250, setEditPrice250] = useState('');
  const [editPrice500, setEditPrice500] = useState('');
  const [editPrice1000, setEditPrice1000] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);
  const [deleteHoneyItem, setDeleteHoneyItem] = useState<HoneyType | null>(null);

  // Helpers: decimal with comma input â†’ number
  function parseCommaNumber(s: string): number | null {
    const trimmed = s.trim();
    if (!trimmed) return null;
    const normalized = trimmed.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? null : n;
  }
  const toCommaString = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

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
      setEditing(false);
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
      await beekeepersApi.addHoneyType({
        name: newHoneyName.trim(),
        description: newHoneyDesc || undefined,
        price250: newHoneyPrice250.trim() ? parseCommaNumber(newHoneyPrice250) : null,
        price500: newHoneyPrice500.trim() ? parseCommaNumber(newHoneyPrice500) : null,
        price1000: newHoneyPrice1000.trim() ? parseCommaNumber(newHoneyPrice1000) : null,
        available: newHoneyAvailable,
      });
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
      setNewHoneyName('');
      setNewHoneyDesc('');
      setNewHoneyPrice250('');
      setNewHoneyPrice500('');
      setNewHoneyPrice1000('');
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

  // Email change
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
        const me = await beekeepersApi.getMyProfile();
        setProfile(me);
      } else {
        setError(res?.message || 'BestÃ¤tigung fehlgeschlagen');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler bei der BestÃ¤tigung');
    }
  };

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwNew || pwNew.length < 8 || pwNew !== pwNew2) {
      setError('Bitte neues Passwort prüfen (mind. 8 Zeichen, identisch).');
      return;
    }
    try {
      setError(null);
      const res = await authApi.changePassword(pwCurrent, pwNew);
      if (res?.success) {
        setShowPasswordModal(false);
        setPwCurrent(''); setPwNew(''); setPwNew2('');
      } else {
        setError(res?.message || 'Passwort konnte nicht geändert werden');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Fehler beim Passwort ändern');
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
        <div className="bg-white rounded-lg shadow p-6">Lade Bereich …</div>
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
                <button type="button" onClick={() => { setShowEmailModal(true); setEmailFlowStep('request'); setEmailNew(''); setEmailCode(''); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">E-Mail-Adresse ändern</button>
                <button type="button" onClick={() => setShowPasswordModal(true)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Passwort ändern</button>
                <button type="button" onClick={() => setEditing((v) => !v)} className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700">{editing ? 'Abbrechen' : 'Stammdaten bearbeiten'}</button>
              </div>
            </div>

            {!editing && (
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500">Firmenname: </span><span className="text-gray-900 font-medium">{name || '–'}</span></div>
                <div><span className="text-gray-500">Beschreibung: </span><span className="text-gray-900">{description || '–'}</span></div>
                <div><span className="text-gray-500">Adresse: </span><span className="text-gray-900">{address || '–'}</span></div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><span className="text-gray-500">Stadt: </span><span className="text-gray-900">{city || '–'}</span></div>
                  <div><span className="text-gray-500">PLZ: </span><span className="text-gray-900">{postalCode || '–'}</span></div>
                  <div><span className="text-gray-500">Telefon: </span><span className="text-gray-900">{phone || '–'}</span></div>
                </div>
                <div><span className="text-gray-500">Website: </span><span className="text-gray-900">{website || '–'}</span></div>
              </div>
            )}

            {editing && (
              <form className="space-y-4" onSubmit={handleSaveProfile}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Firmenname</label>
                  <input type="text" id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Beschreibung</label>
                  <textarea id="description" name="description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" rows={4} />
                </div>
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">Adresse</label>
                  <input type="text" id="address" name="address" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">Stadt</label>
                    <input type="text" id="city" name="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700">PLZ</label>
                    <input type="text" id="postalCode" name="postalCode" autoComplete="postal-code" inputMode="numeric" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Telefon</label>
                    <input type="tel" id="phone" name="phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                  <input type="url" id="website" name="website" autoComplete="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md disabled:opacity-50">{saving ? 'Speichern …' : 'Speichern'}</button>
                </div>
              </form>
            )}
          </section>

          {/* Honig anlegen */}
          <section className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-4">Honig anlegen</h2>
            <form className="space-y-4 mb-4" onSubmit={handleAddHoney}>
              <label className="block text-sm font-medium text-gray-700">Honigsorte</label>
              <input type="text" value={newHoneyName} onChange={(e) => setNewHoneyName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <label className="block text-sm font-medium text-gray-700">Beschreibung (optional)</label>
              <input type="text" value={newHoneyDesc} onChange={(e) => setNewHoneyDesc(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Preise</div>
                <p className="text-xs text-gray-500 mb-2">Bitte im Format 4,00 eingeben, wenn die Menge angeboten wird</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="price250" className="text-sm text-gray-700">250 g</label>
                    <input id="price250" type="text" inputMode="decimal" value={newHoneyPrice250} onChange={(e) => setNewHoneyPrice250(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="price500" className="text-sm text-gray-700">500 g</label>
                    <input id="price500" type="text" inputMode="decimal" value={newHoneyPrice500} onChange={(e) => setNewHoneyPrice500(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="price1000" className="text-sm text-gray-700">1000 g</label>
                    <input id="price1000" type="text" inputMode="decimal" value={newHoneyPrice1000} onChange={(e) => setNewHoneyPrice1000(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <Toggle checked={newHoneyAvailable} onChange={(v) => setNewHoneyAvailable(v)} />
                  verfügbar
                </label>
              </div>
              <button type="submit" className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Hinzufügen</button>
            </form>
          </section>
        </div>

        {/* Bestehende Honigsorten */}
        <section className="mt-6">
          {honeyTypes.length === 0 ? (
            <div className="text-sm text-gray-600">Noch keine Honigsorten hinzugefügt.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {honeyTypes.map((h) => (
                <div key={h.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{h.name}</div>
                      {h.description && <div className="text-sm text-gray-600 mt-1">{h.description}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">{h.available ? 'Sichtbar' : 'Versteckt'}</span>
                      <Toggle checked={!!h.available} onChange={() => toggleHoneyAvailability(h)} size="sm" />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-700">
                    {h.price250 != null && <span className="inline-block px-2 py-1 bg-amber-50 rounded border border-amber-200">250 g – {toCommaString(h.price250)} €</span>}
                    {h.price500 != null && <span className="inline-block px-2 py-1 bg-amber-50 rounded border border-amber-200">500 g – {toCommaString(h.price500)} €</span>}
                    {h.price1000 != null && <span className="inline-block px-2 py-1 bg-amber-50 rounded border border-amber-200">1000 g – {toCommaString(h.price1000)} €</span>}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={() => { setEditingHoney(h); setEditName(h.name); setEditDesc(h.description || ''); setEditPrice250(h.price250 != null ? toCommaString(h.price250) : ''); setEditPrice500(h.price500 != null ? toCommaString(h.price500) : ''); setEditPrice1000(h.price1000 != null ? toCommaString(h.price1000) : ''); setEditAvailable(!!h.available); }} className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50">Bearbeiten</button>
                    <button onClick={() => setDeleteHoneyItem(h)} className="px-3 py-1.5 text-xs rounded-md bg-red-50 text-red-700 hover:bg-red-100">Löschen</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Modals */}
        <Modal open={showEmailModal} title="E-Mail-Adresse ändern" onClose={() => setShowEmailModal(false)}>
          {emailFlowStep === 'request' ? (
            <form className="space-y-3" onSubmit={handleEmailRequest}>
              <label className="block text-sm font-medium text-gray-700">Neue E-Mail-Adresse</label>
              <input type="email" autoComplete="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Code senden</button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={handleEmailConfirm}>
              <p className="text-sm text-gray-600">Wir haben dir einen Code an deine aktuelle E-Mail gesendet.</p>
              <label className="block text-sm font-medium text-gray-700">BestÃ¤tigungscode</label>
              <input type="text" inputMode="numeric" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">E-Mail ändern</button>
            </form>
          )}
        </Modal>

        {/* Honig löschen Bestätigung */}
        <Modal open={!!deleteHoneyItem} title="Löschen bestätigen" onClose={() => setDeleteHoneyItem(null)}>
          {deleteHoneyItem && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">Möchtest du „{deleteHoneyItem.name}“ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50" onClick={() => setDeleteHoneyItem(null)}>Abbrechen</button>
                <button className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700" onClick={async () => { await deleteHoney(deleteHoneyItem); setDeleteHoneyItem(null); }}>Endgültig löschen</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal open={showPasswordModal} title="Passwort ändern" onClose={() => setShowPasswordModal(false)}>
          <form className="space-y-3" onSubmit={handleChangePassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aktuelles Passwort</label>
              <input type="password" autoComplete="current-password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Neues Passwort</label>
              <input type="password" autoComplete="new-password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Neues Passwort bestätigen</label>
              <input type="password" autoComplete="new-password" value={pwNew2} onChange={(e) => setPwNew2(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" required minLength={8} />
            </div>
            <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Passwort speichern</button>
          </form>
        </Modal>

        {/* Honigsorte bearbeiten */}
        <Modal open={!!editingHoney} title="Honigsorte bearbeiten" onClose={() => setEditingHoney(null)}>
          {editingHoney && (
            <form className="space-y-3" onSubmit={async (e) => {
              e.preventDefault();
              try {
                await beekeepersApi.updateHoneyType(editingHoney.id, {
                  name: editName || undefined,
                  description: editDesc || undefined,
                  price250: editPrice250.trim() ? parseCommaNumber(editPrice250) : null,
                  price500: editPrice500.trim() ? parseCommaNumber(editPrice500) : null,
                  price1000: editPrice1000.trim() ? parseCommaNumber(editPrice1000) : null,
                  available: editAvailable,
                });
                const me = await beekeepersApi.getMyProfile();
                setHoneyTypes(me.honeyTypes || []);
                setEditingHoney(null);
              } catch (err: any) {
                setError(err?.response?.data?.message || 'Fehler beim Aktualisieren der Honigsorte');
              }
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 mb-1">Preise</div>
                <p className="text-xs text-gray-500 mb-2">Bitte im Format 4,00 eingeben, wenn die Menge angeboten wird</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="editPrice250" className="text-sm text-gray-700">250 g</label>
                    <input id="editPrice250" type="text" inputMode="decimal" value={editPrice250} onChange={(e) => setEditPrice250(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="editPrice500" className="text-sm text-gray-700">500 g</label>
                    <input id="editPrice500" type="text" inputMode="decimal" value={editPrice500} onChange={(e) => setEditPrice500(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="editPrice1000" className="text-sm text-gray-700">1000 g</label>
                    <input id="editPrice1000" type="text" inputMode="decimal" value={editPrice1000} onChange={(e) => setEditPrice1000(e.target.value)} className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Sichtbar</span>
                <Toggle checked={editAvailable} onChange={(v) => setEditAvailable(v)} />
              </div>
              <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md">Speichern</button>
            </form>
          )}
        </Modal>
      </div>
    </main>
  );
}

function Toggle({ checked, onChange, size = 'md' }: { checked: boolean; onChange: (val: boolean) => void; size?: 'sm' | 'md' }) {
  const dims = size === 'sm'
    ? { w: 'w-10', h: 'h-5', knob: 'h-4 w-4', translate: 'translate-x-5' }
    : { w: 'w-12', h: 'h-6', knob: 'h-5 w-5', translate: 'translate-x-6' };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${dims.w} ${dims.h} inline-flex items-center rounded-full transition-colors duration-200 ${checked ? 'bg-amber-600' : 'bg-gray-300'}`}
    >
      <span
        className={`${dims.knob} bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? dims.translate : 'translate-x-1'}`}
      />
    </button>
  );
}

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



