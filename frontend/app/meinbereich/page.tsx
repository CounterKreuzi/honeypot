/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { beekeepersApi } from '@/lib/api/beekeepers';
import type { Beekeeper, HoneyType } from '@/types/api';
import { authApi } from '@/lib/api/auth';
import { getApiErrorMessage } from '@/lib/api/errors';

type AuthProfileResponse = {
  data?: {
    user?: {
      email?: string;
    };
  };
};

export default function MeinBereichPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Beekeeper | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Image cropping
  const [cropModal, setCropModal] = useState<{ src: string } | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [frameSize, setFrameSize] = useState({ width: 360, height: 480 });
  const frameRef = useRef<HTMLDivElement | null>(null);

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

  // Image helpers
  const handleImageSelect = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        setCropModal({ src: result });
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const MAX_IMAGE_BYTES = 700_000;

  const getDataUrlSize = (dataUrl: string) => Math.round((dataUrl.length * 3) / 4);

  const compressCanvas = useCallback((baseCanvas: HTMLCanvasElement, initialQuality = 0.92) => {
    let quality = initialQuality;
    let workingCanvas = baseCanvas;
    const shrinkCanvas = () => {
      const nextCanvas = document.createElement('canvas');
      nextCanvas.width = Math.round(workingCanvas.width * 0.9);
      nextCanvas.height = Math.round(workingCanvas.height * 0.9);
      const ctx = nextCanvas.getContext('2d');
      if (!ctx) return workingCanvas;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      ctx.drawImage(workingCanvas, 0, 0, nextCanvas.width, nextCanvas.height);
      return nextCanvas;
    };

    let dataUrl = workingCanvas.toDataURL('image/jpeg', quality);
    let size = getDataUrlSize(dataUrl);

    while (size > MAX_IMAGE_BYTES && quality > 0.5) {
      quality = Math.max(0.5, quality - 0.1);
      dataUrl = workingCanvas.toDataURL('image/jpeg', quality);
      size = getDataUrlSize(dataUrl);
    }

    while (size > MAX_IMAGE_BYTES && workingCanvas.width > 600) {
      workingCanvas = shrinkCanvas();
      dataUrl = workingCanvas.toDataURL('image/jpeg', quality);
      size = getDataUrlSize(dataUrl);
    }

    return dataUrl;
  }, []);

  const createCroppedImage = useCallback(async () => {
    if (!cropModal || !imageMeta) return null;
    const image = new Image();
    image.src = cropModal.src;
    await new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });

    const targetWidth = 900;
    const targetHeight = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx || !frameSize.width || !frameSize.height) return null;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const fitScale = Math.min(frameSize.width / imageMeta.width, frameSize.height / imageMeta.height);
    const currentScale = fitScale * zoom;
    const displayWidth = imageMeta.width * currentScale;
    const displayHeight = imageMeta.height * currentScale;

    const frameCenterX = frameSize.width / 2 + offset.x;
    const frameCenterY = frameSize.height / 2 + offset.y;
    const topLeftX = frameCenterX - displayWidth / 2;
    const topLeftY = frameCenterY - displayHeight / 2;

    const scaleFactor = targetWidth / frameSize.width;

    // Calculate the portion of the original image that is visible inside the frame
    const sourceX = Math.max(0, -topLeftX / currentScale);
    const sourceY = Math.max(0, -topLeftY / currentScale);
    const sourceWidth = Math.min(imageMeta.width - sourceX, frameSize.width / currentScale);
    const sourceHeight = Math.min(imageMeta.height - sourceY, frameSize.height / currentScale);

    // Mirror the on-screen positioning onto the export canvas
    const destX = Math.max(0, topLeftX * scaleFactor);
    const destY = Math.max(0, topLeftY * scaleFactor);
    const destWidth = sourceWidth * currentScale * scaleFactor;
    const destHeight = sourceHeight * currentScale * scaleFactor;

    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);

    return compressCanvas(canvas);
  }, [compressCanvas, cropModal, frameSize.height, frameSize.width, imageMeta, offset.x, offset.y, zoom]);

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
        setPhotoPreview(me.photo || '');
        setHoneyTypes(me.honeyTypes || []);
        // also fetch user email for display
        try {
          const profileRes = (await authApi.getProfile()) as AuthProfileResponse;
          setUserEmail(profileRes?.data?.user?.email || '');
        } catch {}

        // show banner if we just confirmed an email change (client-side only)
        if (typeof window !== 'undefined') {
          const sp = new URLSearchParams(window.location.search);
          const changed = sp.get('emailChanged');
          if (changed) {
            setInfoMessage(`Ihre E-Mail-Adresse wurde erfolgreich auf ${changed} geändert.`);
          }
        }
        setError(null);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Fehler beim Laden deines Profils'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthed, router]);

  useEffect(() => {
    if (!cropModal?.src) {
      setImageMeta(null);
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setImageMeta({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = cropModal.src;
  }, [cropModal]);

  useEffect(() => {
    if (!cropModal) return;
    if (!frameRef.current) return;
    const updateSize = () => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (rect) {
        setFrameSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(frameRef.current);
    return () => observer.disconnect();
  }, [cropModal]);

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
        photo: photoPreview || undefined,
      });
      setProfile(updated);
      setEditing(false);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Speichern'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Hinzufügen der Honigsorte'));
    }
  };

  const toDataUrl = async (src: string) => {
    if (src.startsWith('data:')) return src;
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error('Konnte Bild nicht laden');
    }
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Konnte Bild nicht laden'));
        }
      };
      reader.onerror = () => reject(new Error('Konnte Bild nicht laden'));
      reader.readAsDataURL(blob);
    });
  };

  const handleCropConfirm = async () => {
    try {
      setSavingPhoto(true);
      const result = await createCroppedImage();
      if (result) {
        const updated = await beekeepersApi.updateProfile({ photo: result });
        setPhotoPreview(result);
        setProfile(updated);
        setError(null);
        setCropModal(null);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Speichern des Profilbilds'));
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleClearPhoto = async () => {
    try {
      setSavingPhoto(true);
      const updated = await beekeepersApi.updateProfile({ photo: null });
      setPhotoPreview('');
      setProfile(updated);
      setError(null);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Entfernen des Profilbilds'));
    } finally {
      setSavingPhoto(false);
    }
  };

  const reopenCropperWithExistingPhoto = async () => {
    if (!photoPreview) return;
    try {
      const src = await toDataUrl(photoPreview);
      setCropModal({ src });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Aktuelles Profilbild konnte nicht bearbeitet werden'));
    }
  };

  const startDrag = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    setOffset((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const stopDrag = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const toggleHoneyAvailability = async (h: HoneyType) => {
    try {
      await beekeepersApi.updateHoneyType(h.id, { available: !h.available });
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Aktualisieren'));
    }
  };

  const deleteHoney = async (h: HoneyType) => {
    try {
      await beekeepersApi.deleteHoneyType(h.id);
      const me = await beekeepersApi.getMyProfile();
      setHoneyTypes(me.honeyTypes || []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Löschen'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Senden des Codes'));
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
        setInfoMessage('Wir haben dir einen Bestätigungslink an deine neue E-Mail-Adresse gesendet. Bitte klicke ihn, um die Änderung abzuschließen.');
        const me = await beekeepersApi.getMyProfile();
        setProfile(me);
      } else {
        setError(res?.message || 'BestÃ¤tigung fehlgeschlagen');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler bei der Bestätigung'));
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
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Fehler beim Passwort ändern'));
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
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="px-3 py-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 rounded-md">
              Zur Startseite
            </button>
            <button onClick={logout} className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md">
              Abmelden
            </button>
          </div>
        </div>

        {infoMessage && (
          <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded p-3">{infoMessage}</div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stammdaten */}
          <section className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Stammdaten</h2>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setShowEmailModal(true); setEmailFlowStep('request'); setEmailNew(''); setEmailCode(''); }} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">E-Mail-Adresse ändern</button>
                    <button type="button" onClick={() => setShowPasswordModal(true)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50">Passwort ändern</button>
                    <button type="button" onClick={() => setEditing((v) => !v)} className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-md hover:bg-amber-700">{editing ? 'Abbrechen' : 'Stammdaten bearbeiten'}</button>
                  </div>
                </div>
              </div>
              <div className="w-full lg:w-64">
                <div className="p-4 border border-amber-100 bg-amber-50/60 rounded-lg shadow-sm flex gap-3">
                  <div className="relative w-20" style={{ aspectRatio: '3 / 4' }}>
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profilbild" className="h-full w-full rounded-md object-cover border border-amber-100" />
                    ) : (
                      <div className="h-full w-full rounded-md border border-dashed border-amber-200 bg-white/80 text-xs text-gray-500 flex items-center justify-center text-center px-2">
                        Kein Profilbild
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-sm">
                    <div className="font-semibold text-gray-900 leading-5">Profilbild</div>
                    <p className="text-xs text-gray-600">Kleines Format direkt in den Stammdaten bearbeiten.</p>
                    <div className="flex flex-wrap gap-2">
                      <label
                        htmlFor="profile-photo-upload"
                        className="px-3 py-1.5 text-xs rounded-md bg-white text-amber-800 border border-amber-200 cursor-pointer hover:bg-amber-100 disabled:opacity-60"
                      >
                        Bild wählen
                      </label>
                      {photoPreview && (
                        <>
                          <button
                            type="button"
                            onClick={reopenCropperWithExistingPhoto}
                            disabled={savingPhoto}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
                          >
                            Anpassen
                          </button>
                          <button
                            type="button"
                            onClick={handleClearPhoto}
                            disabled={savingPhoto}
                            className="px-3 py-1.5 text-xs rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-60"
                          >
                            Entfernen
                          </button>
                        </>
                      )}
                    </div>
                    <input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                      disabled={savingPhoto}
                    />
                  </div>
                </div>
              </div>
            </div>

            {!editing && (
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500">E-Mail: </span><span className="text-gray-900">{userEmail || '—'}</span></div>
                <div><span className="text-gray-500">Firmenname: </span><span className="text-gray-900 font-medium">{name || '—'}</span></div>
                <div><span className="text-gray-500">Beschreibung: </span><span className="text-gray-900">{description || '—'}</span></div>
                <div><span className="text-gray-500">Adresse: </span><span className="text-gray-900">{address || '—'}</span></div>
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
        {cropModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Bild zuschneiden (3:4)</h3>
                  <p className="text-sm text-gray-600">Ziehe das Bild oder passe den Zoom an. Weißraum wird mit weißem Hintergrund gefüllt.</p>
                </div>
                <button onClick={() => setCropModal(null)} className="text-sm text-gray-600 hover:text-gray-900">Schließen</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div
                  ref={frameRef}
                  className="relative w-full bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
                  style={{ aspectRatio: '3 / 4', minHeight: '320px' }}
                  onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
                  onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
                  onMouseUp={stopDrag}
                  onMouseLeave={stopDrag}
                  onTouchStart={(e) => {
                    if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  onTouchMove={(e) => {
                    if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
                  }}
                  onTouchEnd={stopDrag}
                  onTouchCancel={stopDrag}
                >
                  <div className="absolute inset-0 bg-white" />
                  {imageMeta ? (
                    <img
                      src={cropModal.src}
                      alt="Zu beschneidendes Bild"
                      draggable={false}
                      className="absolute top-1/2 left-1/2 select-none shadow-sm"
                      style={{
                        width: `${imageMeta.width * Math.min(frameSize.width / imageMeta.width, frameSize.height / imageMeta.height)}px`,
                        height: `${imageMeta.height * Math.min(frameSize.width / imageMeta.width, frameSize.height / imageMeta.height)}px`,
                        transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                        transformOrigin: 'center',
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Bild wird geladen …</div>
                  )}
                  <div className="absolute inset-0 pointer-events-none border-2 border-amber-500" />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Zoom</label>
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Mehr Weißraum</span>
                      <span>Stärkerer Zuschnitt</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setOffset({ x: 0, y: 0 });
                    }}
                    className="px-3 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
                  >
                    Zurücksetzen
                  </button>
                  <p className="text-sm text-gray-600">
                    Das Ergebnis wird auf 3:4 gebracht. Wenn du das Bild kleiner ziehst oder verschiebst, entsteht automatisch weißer Hintergrund – praktisch, wenn du mehr Freiraum um dein Profilbild möchtest.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  className="px-4 py-2 text-sm rounded-md border border-gray-200 hover:bg-gray-50"
                  onClick={() => setCropModal(null)}
                >
                  Abbrechen
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                  onClick={handleCropConfirm}
                  disabled={savingPhoto}
                >
                  Übernehmen &amp; Speichern
                </button>
              </div>
            </div>
          </div>
        )}
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
              } catch (err: unknown) {
                setError(getApiErrorMessage(err, 'Fehler beim Aktualisieren der Honigsorte'));
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



