'use client';

import { ChangeEvent, FormEvent, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import {
  adminApi,
  AdminBeekeeper,
  AdminCreateBeekeeperPayload,
  AdminUpdateBeekeeperPayload,
} from '@/lib/api/admin';
import { HoneyType } from '@/types/api';

const PAGE_SIZE = 20;

type ActiveFilter = 'all' | 'active' | 'inactive';
type VerifiedFilter = 'all' | 'verified' | 'unverified';

type AuthState = 'checking' | 'allowed' | 'denied';

interface EditFormState {
  name: string;
  salutation: string;
  firstName: string;
  lastName: string;
  companyName: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  customerPhone: string;
  adminPhone: string;
  website: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  isVerified: boolean;
}

interface CreateFormState {
  email: string;
  password: string;
  name: string;
  salutation: string;
  firstName: string;
  lastName: string;
  companyName: string;
  description: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  customerPhone: string;
  adminPhone: string;
  website: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  isVerified: boolean;
}

const emptyEditForm: EditFormState = {
  name: '',
  salutation: '',
  firstName: '',
  lastName: '',
  companyName: '',
  description: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  customerPhone: '',
  adminPhone: '',
  website: '',
  latitude: '',
  longitude: '',
  isActive: true,
  isVerified: false,
};

const emptyCreateForm: CreateFormState = {
  email: '',
  password: '',
  name: '',
  salutation: '',
  firstName: '',
  lastName: '',
  companyName: '',
  description: '',
  address: '',
  city: '',
  postalCode: '',
  country: '',
  phone: '',
  customerPhone: '',
  adminPhone: '',
  website: '',
  latitude: '',
  longitude: '',
  isActive: true,
  isVerified: false,
};

const numberFromInput = (value: string): number | undefined => {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseCommaNumber = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const toCommaString = (value: number | string | null | undefined): string => {
  if (value == null) return '';
  const asNumber = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(asNumber)) return '';
  return String(asNumber).replace('.', ',');
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [verifiedFilter, setVerifiedFilter] = useState<VerifiedFilter>('all');

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<AdminBeekeeper[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });

  const [selected, setSelected] = useState<AdminBeekeeper | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm);
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [honeyError, setHoneyError] = useState<string | null>(null);
  const [honeyFeedback, setHoneyFeedback] = useState<string | null>(null);
  const [savingHoney, setSavingHoney] = useState(false);
  const [newHoneyName, setNewHoneyName] = useState('');
  const [newHoneyDescription, setNewHoneyDescription] = useState('');
  const [newHoneyPrice250, setNewHoneyPrice250] = useState('');
  const [newHoneyPrice500, setNewHoneyPrice500] = useState('');
  const [newHoneyPrice1000, setNewHoneyPrice1000] = useState('');
  const [newHoneyAvailable, setNewHoneyAvailable] = useState(true);
  const [editingHoney, setEditingHoney] = useState<HoneyType | null>(null);
  const [editHoneyName, setEditHoneyName] = useState('');
  const [editHoneyDescription, setEditHoneyDescription] = useState('');
  const [editHoneyPrice250, setEditHoneyPrice250] = useState('');
  const [editHoneyPrice500, setEditHoneyPrice500] = useState('');
  const [editHoneyPrice1000, setEditHoneyPrice1000] = useState('');
  const [editHoneyAvailable, setEditHoneyAvailable] = useState(true);
  const [deleteHoneyTarget, setDeleteHoneyTarget] = useState<HoneyType | null>(null);

  const activeFilterValue = activeFilter === 'all' ? undefined : activeFilter === 'active';
  const verifiedFilterValue = verifiedFilter === 'all' ? undefined : verifiedFilter === 'verified';
  const searchQuery = debouncedSearch.trim() || undefined;

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login?redirect=/admin');
      return;
    }
    const verify = async () => {
      try {
        const profile = await authApi.getProfile();
        const role = profile?.data?.user?.role;
        if (role !== 'admin') {
          setAuthError('Sie benötigen Admin-Rechte, um diesen Bereich aufzurufen.');
          setAuthState('denied');
          router.replace('/meinbereich');
          return;
        }
        setAdminEmail(profile?.data?.user?.email || '');
        setAuthState('allowed');
        setAuthError(null);
      } catch (error: unknown) {
        setAuthError(getApiErrorMessage(error, 'Authentifizierung fehlgeschlagen.'));
        setAuthState('denied');
      }
    };
    verify();
  }, [router]);

  const loadBeekeepers = useCallback(
    async (pageToLoad: number, focusId?: string) => {
      setListLoading(true);
      setListError(null);
      try {
        const response = await adminApi.listBeekeepers({
          page: pageToLoad,
          limit: PAGE_SIZE,
          search: searchQuery,
          isActive: activeFilterValue,
          isVerified: verifiedFilterValue,
        });
        const { items: beekeepers, pagination: paginationData } = response.data;
        setItems(beekeepers);
        setPagination(paginationData);
        setSelected((prev) => {
          if (focusId) {
            return beekeepers.find((item) => item.id === focusId) || beekeepers[0] || null;
          }
          if (prev) {
            const stillAvailable = beekeepers.find((item) => item.id === prev.id);
            return stillAvailable || beekeepers[0] || null;
          }
          return beekeepers[0] || null;
        });
      } catch (error: unknown) {
        setListError(getApiErrorMessage(error, 'Fehler beim Laden der Imkerliste.'));
      } finally {
        setListLoading(false);
      }
    },
    [activeFilterValue, searchQuery, verifiedFilterValue]
  );

  const refreshBeekeeper = useCallback(
    async (beekeeperId: string) => {
      try {
        const response = await adminApi.getBeekeeper(beekeeperId);
        if (response.success) {
          setSelected(response.data);
          setItems((prev) =>
            prev.map((item) => (item.id === response.data.id ? response.data : item))
          );
        }
      } catch (error: unknown) {
        setHoneyError(getApiErrorMessage(error, 'Imker konnte nicht aktualisiert werden.'));
      }
    },
    []
  );

  const loadBeekeepersRef = useRef(loadBeekeepers);
  useEffect(() => {
    loadBeekeepersRef.current = loadBeekeepers;
  }, [loadBeekeepers]);

  useEffect(() => {
    if (authState !== 'allowed') return;
    loadBeekeepersRef.current?.(1);
  }, [activeFilterValue, authState, searchQuery, verifiedFilterValue]);

  useEffect(() => {
    if (!selected) {
      setEditForm(emptyEditForm);
      return;
    }
    setEditForm({
      name: selected.name || '',
      salutation: selected.salutation || '',
      firstName: selected.firstName || '',
      lastName: selected.lastName || '',
      companyName: selected.companyName || '',
      description: selected.description || '',
      address: selected.address || '',
      city: selected.city || '',
      postalCode: selected.postalCode || '',
      country: selected.country || '',
      phone: selected.phone || '',
      customerPhone: selected.customerPhone || '',
      adminPhone: selected.adminPhone || '',
      website: selected.website || '',
      latitude: selected.latitude ? String(selected.latitude) : '',
      longitude: selected.longitude ? String(selected.longitude) : '',
      isActive: Boolean(selected.isActive),
      isVerified: Boolean(selected.isVerified),
    });
    setEditFeedback(null);
    setEditError(null);
    setHoneyError(null);
    setHoneyFeedback(null);
    setNewHoneyName('');
    setNewHoneyDescription('');
    setNewHoneyPrice250('');
    setNewHoneyPrice500('');
    setNewHoneyPrice1000('');
    setNewHoneyAvailable(true);
    setEditingHoney(null);
    setDeleteHoneyTarget(null);
  }, [selected]);

  const handleEditInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleCreateInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleUpdateBeekeeper = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSavingEdit(true);
    setEditFeedback(null);
    setEditError(null);
    try {
      const payload: AdminUpdateBeekeeperPayload = {
        name: editForm.name.trim(),
        salutation: editForm.salutation.trim() || null,
        firstName: editForm.firstName.trim() || null,
        lastName: editForm.lastName.trim() || null,
        companyName: editForm.companyName.trim() || null,
        description: editForm.description.trim() || null,
        address: editForm.address.trim() || undefined,
        city: editForm.city.trim() || null,
        postalCode: editForm.postalCode.trim() || null,
        country: editForm.country.trim() || null,
        phone: editForm.phone.trim() || null,
        customerPhone: editForm.customerPhone.trim() || null,
        adminPhone: editForm.adminPhone.trim() || null,
        website: editForm.website.trim() || null,
        isActive: editForm.isActive,
        isVerified: editForm.isVerified,
      };

      const latitude = numberFromInput(editForm.latitude);
      const longitude = numberFromInput(editForm.longitude);
      if (typeof latitude === 'number') {
        payload.latitude = latitude;
      }
      if (typeof longitude === 'number') {
        payload.longitude = longitude;
      }

      Object.keys(payload).forEach((key) => {
        if (payload[key as keyof AdminUpdateBeekeeperPayload] === undefined) {
          delete payload[key as keyof AdminUpdateBeekeeperPayload];
        }
      });

      const response = await adminApi.updateBeekeeper(selected.id, payload);
      setSelected(response.data);
      setItems((prev) =>
        prev.map((item) => (item.id === response.data.id ? response.data : item))
      );
      setEditFeedback(null);
      setGlobalSuccess(response.message || 'Änderungen erfolgreich gespeichert');
      setIsEditModalOpen(false);
    } catch (error: unknown) {
      setEditError(getApiErrorMessage(error, 'Aktualisierung fehlgeschlagen.'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateBeekeeper = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateFeedback(null);
    setCreateError(null);
    try {
      const payload: AdminCreateBeekeeperPayload = {
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name.trim(),
        address: createForm.address.trim(),
        salutation: createForm.salutation.trim() || null,
        firstName: createForm.firstName.trim() || null,
        lastName: createForm.lastName.trim() || null,
        companyName: createForm.companyName.trim() || null,
        description: createForm.description.trim() || null,
        city: createForm.city.trim() || null,
        postalCode: createForm.postalCode.trim() || null,
        country: createForm.country.trim() || null,
        phone: createForm.phone.trim() || null,
        customerPhone: createForm.customerPhone.trim() || null,
        adminPhone: createForm.adminPhone.trim() || null,
        website: createForm.website.trim() || null,
        isActive: createForm.isActive,
        isVerified: createForm.isVerified,
      };

      const latitude = numberFromInput(createForm.latitude);
      const longitude = numberFromInput(createForm.longitude);
      if (typeof latitude === 'number') {
        payload.latitude = latitude;
      }
      if (typeof longitude === 'number') {
        payload.longitude = longitude;
      }

      const response = await adminApi.createBeekeeper(payload);
      setCreateFeedback(response.message || 'Imker wurde angelegt.');
      setCreateForm(emptyCreateForm);
      loadBeekeepersRef.current?.(1, response.data.beekeeper.id);
    } catch (error: unknown) {
      setCreateError(getApiErrorMessage(error, 'Neuanlage fehlgeschlagen.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBeekeeper = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      'Dieser Eintrag wird unwiderruflich gelöscht. Möchtest du fortfahren?'
    );
    if (!confirmed) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteBeekeeper(selected.id);
      setIsEditModalOpen(false);
      loadBeekeepersRef.current?.(1);
    } catch (error: unknown) {
      setDeleteError(getApiErrorMessage(error, 'Löschen fehlgeschlagen.'));
    } finally {
      setDeleting(false);
    }
  };

  const resetHoneyForm = () => {
    setNewHoneyName('');
    setNewHoneyDescription('');
    setNewHoneyPrice250('');
    setNewHoneyPrice500('');
    setNewHoneyPrice1000('');
    setNewHoneyAvailable(true);
  };

  const handleAddHoneyType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSavingHoney(true);
    setHoneyError(null);
    setHoneyFeedback(null);
    try {
      await adminApi.addHoneyType(selected.id, {
        name: newHoneyName.trim(),
        description: newHoneyDescription.trim() || null,
        price250: newHoneyPrice250.trim() ? parseCommaNumber(newHoneyPrice250) : null,
        price500: newHoneyPrice500.trim() ? parseCommaNumber(newHoneyPrice500) : null,
        price1000: newHoneyPrice1000.trim() ? parseCommaNumber(newHoneyPrice1000) : null,
        available: newHoneyAvailable,
      });
      await refreshBeekeeper(selected.id);
      resetHoneyForm();
      setHoneyFeedback('Honigsorte angelegt.');
    } catch (error: unknown) {
      setHoneyError(getApiErrorMessage(error, 'Honigsorte konnte nicht angelegt werden.'));
    } finally {
      setSavingHoney(false);
    }
  };

  const openHoneyEditor = (honey: HoneyType) => {
    setEditingHoney(honey);
    setEditHoneyName(honey.name || '');
    setEditHoneyDescription(honey.description || '');
    setEditHoneyPrice250(honey.price250 != null ? toCommaString(honey.price250) : '');
    setEditHoneyPrice500(honey.price500 != null ? toCommaString(honey.price500) : '');
    setEditHoneyPrice1000(honey.price1000 != null ? toCommaString(honey.price1000) : '');
    setEditHoneyAvailable(Boolean(honey.available));
    setHoneyError(null);
    setHoneyFeedback(null);
  };

  const handleUpdateHoneyType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !editingHoney) return;
    setSavingHoney(true);
    setHoneyError(null);
    setHoneyFeedback(null);
    try {
      await adminApi.updateHoneyType(selected.id, editingHoney.id, {
        name: editHoneyName.trim() || undefined,
        description: editHoneyDescription.trim() || null,
        price250: editHoneyPrice250.trim() ? parseCommaNumber(editHoneyPrice250) : null,
        price500: editHoneyPrice500.trim() ? parseCommaNumber(editHoneyPrice500) : null,
        price1000: editHoneyPrice1000.trim() ? parseCommaNumber(editHoneyPrice1000) : null,
        available: editHoneyAvailable,
      });
      await refreshBeekeeper(selected.id);
      setEditingHoney(null);
      setHoneyFeedback('Honigsorte aktualisiert.');
    } catch (error: unknown) {
      setHoneyError(getApiErrorMessage(error, 'Honigsorte konnte nicht aktualisiert werden.'));
    } finally {
      setSavingHoney(false);
    }
  };

  const handleToggleHoneyAvailability = async (honey: HoneyType) => {
    if (!selected) return;
    setHoneyError(null);
    try {
      await adminApi.updateHoneyType(selected.id, honey.id, {
        available: !honey.available,
      });
      await refreshBeekeeper(selected.id);
    } catch (error: unknown) {
      setHoneyError(getApiErrorMessage(error, 'Status konnte nicht geändert werden.'));
    }
  };

  const handleDeleteHoneyType = async () => {
    if (!selected || !deleteHoneyTarget) return;
    setSavingHoney(true);
    setHoneyError(null);
    try {
      await adminApi.deleteHoneyType(selected.id, deleteHoneyTarget.id);
      await refreshBeekeeper(selected.id);
      setHoneyFeedback('Honigsorte gelöscht.');
    } catch (error: unknown) {
      setHoneyError(getApiErrorMessage(error, 'Honigsorte konnte nicht gelöscht werden.'));
    } finally {
      setSavingHoney(false);
      setDeleteHoneyTarget(null);
    }
  };

  const openEditModal = (beekeeper: AdminBeekeeper) => {
    setSelected(beekeeper);
    setEditFeedback(null);
    setEditError(null);
    setDeleteError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditFeedback(null);
    setEditError(null);
    setDeleteError(null);
  };

  const openCreateModal = () => {
    setCreateForm(emptyCreateForm);
    setCreateFeedback(null);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError(null);
    setCreateFeedback(null);
  };

  const handleChangePage = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && pagination.page > 1) {
      loadBeekeepersRef.current?.(pagination.page - 1);
    }
    if (direction === 'next' && pagination.page < pagination.totalPages) {
      loadBeekeepersRef.current?.(pagination.page + 1);
    }
  };

  if (authState === 'checking') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-amber-900">Prüfe Berechtigungen ...</p>
        </div>
      </main>
    );
  }

  if (authState === 'denied') {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-6 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Kein Zugriff</h1>
          <p className="text-gray-600 mb-4">
            {authError || 'Du bist nicht berechtigt, diesen Bereich zu sehen.'}
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold"
          >
            Zur Anmeldung
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <header className="mb-8">
          <p className="text-sm font-medium text-amber-700 uppercase tracking-wide">Admin-Backend</p>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Imkerverwaltung</h1>
              <p className="text-gray-600 mt-1">
                Alle Einträge an einem Ort prüfen, bearbeiten und neu anlegen.
              </p>
            </div>
            {adminEmail && (
              <div className="bg-white shadow rounded-lg p-4 border border-amber-100">
                <p className="text-xs uppercase tracking-wide text-gray-500">Angemeldet als</p>
                <p className="text-sm font-semibold text-gray-900">{adminEmail}</p>
              </div>
            )}
          </div>
        </header>

        {globalSuccess && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="font-medium">{globalSuccess}</p>
            <button
              type="button"
              onClick={() => setGlobalSuccess(null)}
              className="text-emerald-700 text-xs font-semibold uppercase tracking-wide"
            >
              Schließen
            </button>
          </div>
        )}

        <section className="bg-white shadow rounded-2xl p-6 mb-8 border border-amber-100">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suche</label>
              <input
                type="text"
                name="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, Stadt oder E-Mail"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
              >
                <option value="all">Alle</option>
                <option value="active">Nur aktive</option>
                <option value="inactive">Nur inaktive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verifizierung</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={verifiedFilter}
                onChange={(event) => setVerifiedFilter(event.target.value as VerifiedFilter)}
              >
                <option value="all">Alle</option>
                <option value="verified">Verifizierte</option>
                <option value="unverified">Nicht verifizierte</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setActiveFilter('all');
                  setVerifiedFilter('all');
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
              >
                Reset
              </button>
            </div>
          </div>
          {listError && (
            <p className="mt-4 text-sm text-red-600">{listError}</p>
          )}
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Alle Imker</h2>
            <p className="text-sm text-gray-500">
              {pagination.total} Einträge · Seite {pagination.page} von {pagination.totalPages}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadBeekeepersRef.current?.(pagination.page)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700"
            >
              Aktualisieren
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold"
            >
              Neuen Imker anlegen
            </button>
          </div>
        </div>

        <section className="bg-white shadow rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-600">
              Klicke auf einen Eintrag, um Details hervorzuheben, oder nutze die Aktionen zum Bearbeiten.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-amber-50 text-amber-900 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Kontakt</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Verifiziert</th>
                    <th className="px-4 py-3 text-left">Ort</th>
                    <th className="px-4 py-3 text-left">Aktualisiert</th>
                    <th className="px-4 py-3 text-left">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && !listLoading && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        Keine Einträge gefunden.
                      </td>
                    </tr>
                  )}
                  {items.map((beekeeper) => {
                    const isActiveRow = selected?.id === beekeeper.id;
                    return (
                      <tr
                        key={beekeeper.id}
                        onClick={() => setSelected(beekeeper)}
                        className={`${
                          isActiveRow ? 'bg-amber-50' : 'hover:bg-gray-50'
                        } cursor-pointer transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{beekeeper.name}</p>
                          <p className="text-xs text-gray-500">{beekeeper.companyName || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{beekeeper.user?.email || '—'}</p>
                          <p className="text-xs text-gray-500">{beekeeper.phone || 'keine Nummer'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              beekeeper.isActive
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {beekeeper.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              beekeeper.isVerified
                                ? 'bg-sky-50 text-sky-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {beekeeper.isVerified ? 'Bestätigt' : 'Offen'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900">{beekeeper.city || '—'}</p>
                          <p className="text-xs text-gray-500">{beekeeper.postalCode || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {beekeeper.updatedAt
                            ? new Date(beekeeper.updatedAt).toLocaleDateString('de-DE')
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditModal(beekeeper);
                              }}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-medium"
                            >
                              Bearbeiten
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {listLoading && (
              <div className="py-4 text-center text-sm text-gray-500">Lade Einträge ...</div>
            )}

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                disabled={pagination.page === 1}
                onClick={() => handleChangePage('prev')}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
              >
                Zurück
              </button>
              <span className="text-sm text-gray-600">
                Seite {pagination.page} von {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handleChangePage('next')}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 disabled:opacity-50"
              >
                Weiter
              </button>
            </div>
        </section>
      </div>

      <Modal isOpen={isEditModalOpen && !!selected} onClose={closeEditModal} title="Imker bearbeiten">
        {selected ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              ID {selected.id.slice(0, 8)}… · {selected.user?.email || 'Keine E-Mail hinterlegt'}
            </p>
            <form className="space-y-4" onSubmit={handleUpdateBeekeeper}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleEditInputChange}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Anrede</label>
                    <input
                      type="text"
                      name="salutation"
                      value={editForm.salutation}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Firma</label>
                    <input
                      type="text"
                      name="companyName"
                      value={editForm.companyName}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Vorname</label>
                    <input
                      type="text"
                      name="firstName"
                      value={editForm.firstName}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nachname</label>
                    <input
                      type="text"
                      name="lastName"
                      value={editForm.lastName}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditInputChange}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Adresse</label>
                  <input
                    type="text"
                    name="address"
                    value={editForm.address}
                    onChange={handleEditInputChange}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">PLZ</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={editForm.postalCode}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Stadt</label>
                    <input
                      type="text"
                      name="city"
                      value={editForm.city}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Land</label>
                    <input
                      type="text"
                      name="country"
                      value={editForm.country}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Telefon (öffentlich)</label>
                    <input
                      type="text"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Telefon (Kund*innen)</label>
                    <input
                      type="text"
                      name="customerPhone"
                      value={editForm.customerPhone}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Telefon (intern)</label>
                  <input
                    type="text"
                    name="adminPhone"
                    value={editForm.adminPhone}
                    onChange={handleEditInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={editForm.website}
                    onChange={handleEditInputChange}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      value={editForm.latitude}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Longitude</label>
                    <input
                      type="text"
                      name="longitude"
                      value={editForm.longitude}
                      onChange={handleEditInputChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={editForm.isActive}
                      onChange={handleEditCheckboxChange}
                    />
                    Aktiv gelistet
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="isVerified"
                      checked={editForm.isVerified}
                      onChange={handleEditCheckboxChange}
                    />
                    Verifiziert
                  </label>
                </div>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              {editFeedback && <p className="text-sm text-emerald-600">{editFeedback}</p>}
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDeleteBeekeeper}
                  disabled={deleting}
                  className="w-full rounded-lg border border-red-200 px-4 py-2 text-red-600 font-semibold disabled:opacity-50"
                >
                  {deleting ? 'Lösche ...' : 'Eintrag löschen'}
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-amber-600 py-2.5 text-white font-semibold disabled:opacity-50"
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Speichere ...' : 'Änderungen speichern'}
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Honigsorten</p>
                  <h4 className="text-lg font-semibold text-gray-900">Sorten verwalten</h4>
                </div>
                <span className="text-xs text-gray-500">Änderungen gelten sofort für diesen Imker.</span>
              </div>

              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 bg-amber-50 border border-amber-100 rounded-xl p-4"
                onSubmit={handleAddHoneyType}
              >
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Name *</label>
                  <input
                    type="text"
                    value={newHoneyName}
                    onChange={(e) => setNewHoneyName(e.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                  <input
                    type="text"
                    value={newHoneyDescription}
                    onChange={(e) => setNewHoneyDescription(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preis 250 g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newHoneyPrice250}
                    onChange={(e) => setNewHoneyPrice250(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="z.B. 4,50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preis 500 g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newHoneyPrice500}
                    onChange={(e) => setNewHoneyPrice500(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="z.B. 6,90"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Preis 1000 g</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={newHoneyPrice1000}
                    onChange={(e) => setNewHoneyPrice1000(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="z.B. 11,50"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newHoneyAvailable}
                    onChange={(e) => setNewHoneyAvailable(e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">Sichtbar</span>
                </div>
                <div className="sm:col-span-2 flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    onClick={resetHoneyForm}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700"
                  >
                    Zurücksetzen
                  </button>
                  <button
                    type="submit"
                    disabled={savingHoney || !newHoneyName.trim()}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-white font-semibold disabled:opacity-50"
                  >
                    {savingHoney ? 'Speichere ...' : 'Honigsorte anlegen'}
                  </button>
                </div>
              </form>

              {honeyError && <p className="mt-2 text-sm text-red-600">{honeyError}</p>}
              {honeyFeedback && <p className="mt-2 text-sm text-emerald-600">{honeyFeedback}</p>}

              <div className="mt-4 space-y-3">
                {selected.honeyTypes && selected.honeyTypes.length > 0 ? (
                  selected.honeyTypes.map((honey) => (
                    <div
                      key={honey.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-gray-900">{honey.name}</p>
                          {honey.description && (
                            <p className="text-sm text-gray-600">{honey.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                            {honey.price250 != null && (
                              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-1">
                                250 g · {toCommaString(honey.price250)} €
                              </span>
                            )}
                            {honey.price500 != null && (
                              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-1">
                                500 g · {toCommaString(honey.price500)} €
                              </span>
                            )}
                            {honey.price1000 != null && (
                              <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-1">
                                1000 g · {toCommaString(honey.price1000)} €
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              honey.available ? 'text-emerald-700' : 'text-gray-500'
                            }`}
                          >
                            {honey.available ? 'Sichtbar' : 'Versteckt'}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleHoneyAvailability(honey)}
                            className="rounded-lg border border-gray-300 px-3 py-1 text-xs text-gray-700"
                          >
                            {honey.available ? 'Verstecken' : 'Sichtbar schalten'}
                          </button>
                        </div>
                      </div>

                      {editingHoney?.id === honey.id ? (
                        <form
                          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 bg-gray-50 border border-gray-200 rounded-lg p-3"
                          onSubmit={handleUpdateHoneyType}
                        >
                          <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Name</label>
                            <input
                              type="text"
                              value={editHoneyName}
                              onChange={(e) => setEditHoneyName(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Beschreibung</label>
                            <input
                              type="text"
                              value={editHoneyDescription}
                              onChange={(e) => setEditHoneyDescription(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Preis 250 g</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editHoneyPrice250}
                              onChange={(e) => setEditHoneyPrice250(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Preis 500 g</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editHoneyPrice500}
                              onChange={(e) => setEditHoneyPrice500(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Preis 1000 g</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editHoneyPrice1000}
                              onChange={(e) => setEditHoneyPrice1000(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editHoneyAvailable}
                              onChange={(e) => setEditHoneyAvailable(e.target.checked)}
                            />
                            <span className="text-sm text-gray-700">Sichtbar</span>
                          </div>
                          <div className="sm:col-span-2 flex flex-wrap justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingHoney(null)}
                              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
                            >
                              Abbrechen
                            </button>
                            <button
                              type="submit"
                              disabled={savingHoney}
                              className="rounded-lg bg-amber-600 px-4 py-2 text-white font-semibold disabled:opacity-50"
                            >
                              {savingHoney ? 'Speichere ...' : 'Speichern'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openHoneyEditor(honey)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                          >
                            Bearbeiten
                          </button>
                          {deleteHoneyTarget?.id === honey.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setDeleteHoneyTarget(null)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteHoneyType}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white"
                              >
                                Löschen bestätigen
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteHoneyTarget(honey)}
                              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700"
                            >
                              Löschen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Noch keine Honigsorten hinterlegt.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Kein Eintrag ausgewählt.</p>
        )}
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} title="Neuen Imker anlegen">
        <form className="space-y-4" onSubmit={handleCreateBeekeeper}>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">E-Mail</label>
              <input
                type="email"
                name="email"
                value={createForm.email}
                onChange={handleCreateInputChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Initiales Passwort</label>
              <input
                type="password"
                name="password"
                value={createForm.password}
                onChange={handleCreateInputChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={createForm.name}
                onChange={handleCreateInputChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Adresse</label>
              <input
                type="text"
                name="address"
                value={createForm.address}
                onChange={handleCreateInputChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Stadt</label>
                <input
                  type="text"
                  name="city"
                  value={createForm.city}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">PLZ</label>
                <input
                  type="text"
                  name="postalCode"
                  value={createForm.postalCode}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Beschreibung</label>
              <textarea
                name="description"
                value={createForm.description}
                onChange={handleCreateInputChange}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Telefon (öffentlich)</label>
                <input
                  type="text"
                  name="phone"
                  value={createForm.phone}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Telefon (Kund*innen)</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={createForm.customerPhone}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Telefon (intern)</label>
              <input
                type="text"
                name="adminPhone"
                value={createForm.adminPhone}
                onChange={handleCreateInputChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Latitude</label>
                <input
                  type="text"
                  name="latitude"
                  value={createForm.latitude}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Longitude</label>
                <input
                  type="text"
                  name="longitude"
                  value={createForm.longitude}
                  onChange={handleCreateInputChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={createForm.isActive}
                  onChange={handleCreateCheckboxChange}
                />
                Sofort sichtbar
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  name="isVerified"
                  checked={createForm.isVerified}
                  onChange={handleCreateCheckboxChange}
                />
                Bereits verifiziert
              </label>
            </div>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          {createFeedback && <p className="text-sm text-emerald-600">{createFeedback}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-amber-600 py-2.5 text-white font-semibold disabled:opacity-50"
            disabled={creating}
          >
            {creating ? 'Lege an ...' : 'Imker erstellen'}
          </button>
        </form>
      </Modal>
    </main>
  );
}

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-3xl max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <p className="text-sm font-medium text-amber-700 uppercase tracking-wide">Admin</p>
            <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-200 p-2 text-gray-500 hover:text-gray-900"
            aria-label="Modal schließen"
          >
            ✕
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
