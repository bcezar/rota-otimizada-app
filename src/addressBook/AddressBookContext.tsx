import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { syncAddressBook } from './api';
import { useAuth } from '../auth/AuthContext';

const LEGACY_STORAGE_KEY = 'address_book';
const GUEST_STORAGE_KEY = 'address_book_guest';
const USER_STORAGE_PREFIX = 'address_book_user_';
const PENDING_MIGRATION_KEY = 'address_book_pending_migration_user';

export interface Client {
  name: string;
  email: string;
  phone: string;
}

export interface SavedAddress {
  id: string;
  address: string;
  placeName: string;
  notes: string;
  client: Client | null;
  tags: string[];
  updatedAt: string;
  deletedAt: string | null;
  position: number;
}

type SyncStatus = 'loading' | 'local' | 'syncing' | 'synced' | 'offline';

interface AddressBookContextValue {
  addresses: SavedAddress[];
  syncStatus: SyncStatus;
  retrySync: () => void;
  addAddress: (address: string) => string;
  removeAddress: (id: string) => void;
  updateAddress: (id: string, patch: Partial<Omit<SavedAddress, 'id' | 'updatedAt' | 'deletedAt' | 'position'>>) => void;
}

const AddressBookContext = createContext<AddressBookContextValue | null>(null);

function createId(): string {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto);
  if (randomUUID) return randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function validTimestamp(value: unknown): string {
  if (typeof value === 'string' && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return new Date().toISOString();
}

function nextTimestamp(previous?: string): string {
  const now = Date.now();
  const previousMillis = previous ? Date.parse(previous) : 0;
  return new Date(Math.max(now, Number.isFinite(previousMillis) ? previousMillis + 1 : 0)).toISOString();
}

function normalizeRecords(value: unknown, remapLegacyIds = false): SavedAddress[] {
  if (!Array.isArray(value)) return [];
  const now = new Date().toISOString();
  return value.flatMap((item: any, index): SavedAddress[] => {
    if (!item || typeof item !== 'object' || typeof item.address !== 'string') return [];
    const oldId = item.id == null ? '' : String(item.id);
    const id = !oldId || (remapLegacyIds && /^\d+$/.test(oldId)) ? createId() : oldId;
    const client = item.client && typeof item.client === 'object'
      ? {
          name: String(item.client.name ?? ''),
          email: String(item.client.email ?? ''),
          phone: String(item.client.phone ?? ''),
        }
      : null;
    return [{
      id,
      address: item.address,
      placeName: typeof item.placeName === 'string' ? item.placeName : '',
      notes: typeof item.notes === 'string' ? item.notes : '',
      client,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag: unknown) => typeof tag === 'string') : [],
      updatedAt: validTimestamp(item.updatedAt ?? now),
      deletedAt: item.deletedAt ? validTimestamp(item.deletedAt) : null,
      position: Number.isInteger(item.position) && item.position >= 0 ? item.position : index,
    }];
  });
}

function mergeRecords(local: SavedAddress[], remote: SavedAddress[]): SavedAddress[] {
  const merged = new Map(local.map((record) => [record.id, record]));
  for (const record of remote) {
    const current = merged.get(record.id);
    if (!current || Date.parse(record.updatedAt) >= Date.parse(current.updatedAt)) {
      merged.set(record.id, record);
    }
  }
  return [...merged.values()].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

function recordsEqual(left: SavedAddress[], right: SavedAddress[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function readRecords(key: string, remapLegacyIds = false): Promise<SavedAddress[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    return normalizeRecords(JSON.parse(raw), remapLegacyIds);
  } catch {
    return [];
  }
}

export function AddressBookProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, token, user } = useAuth();
  const identity = user?.id ?? 'guest';
  const storageKey = user ? `${USER_STORAGE_PREFIX}${user.id}` : GUEST_STORAGE_KEY;
  const [records, setRecords] = useState<SavedAddress[]>([]);
  const recordsRef = useRef<SavedAddress[]>([]);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [retryVersion, setRetryVersion] = useState(0);

  const replaceRecords = useCallback((next: SavedAddress[]) => {
    recordsRef.current = next;
    setRecords(next);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoadedIdentity(null);
    setSyncStatus('loading');

    (async () => {
      try {
        const userCache = user ? await readRecords(storageKey) : [];
        const [guestCache, legacyCache, pendingUserId] = await Promise.all([
          readRecords(GUEST_STORAGE_KEY),
          readRecords(LEGACY_STORAGE_KEY, true),
          AsyncStorage.getItem(PENDING_MIGRATION_KEY),
        ]);

        let initial = user ? userCache : (guestCache.length ? guestCache : legacyCache);
        if (user) {
          const legacyGuestRecords = guestCache.length ? guestCache : legacyCache;
          const canMigrateGuest =
            legacyGuestRecords.length > 0 && (!pendingUserId || pendingUserId === user.id);
          if (canMigrateGuest) {
            if (!pendingUserId) await AsyncStorage.setItem(PENDING_MIGRATION_KEY, user.id);
            if (!guestCache.length && legacyCache.length) {
              await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(legacyGuestRecords));
              await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
            }
            initial = mergeRecords(initial, legacyGuestRecords);
          }
        } else if (!guestCache.length && legacyCache.length) {
          await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(legacyCache));
          await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        }

        initial = normalizeRecords(initial);
        if (cancelled) return;
        replaceRecords(initial);
        setLoadedIdentity(identity);
        setSyncStatus(token && user ? 'syncing' : 'local');
      } catch {
        if (cancelled) return;
        replaceRecords([]);
        setLoadedIdentity(identity);
        setSyncStatus(token && user ? 'offline' : 'local');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, identity, replaceRecords, storageKey, token, user]);

  useEffect(() => {
    if (loadedIdentity !== identity) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(records)).catch(() => {});
  }, [identity, loadedIdentity, records, storageKey]);

  useEffect(() => {
    if (authLoading || !token || !user || loadedIdentity !== identity) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const serverRecords = await syncAddressBook(recordsRef.current, token);
        if (cancelled || user?.id !== identity) return;
        const merged = mergeRecords(recordsRef.current, normalizeRecords(serverRecords));
        if (!recordsEqual(merged, recordsRef.current)) replaceRecords(merged);
        await AsyncStorage.setItem(storageKey, JSON.stringify(merged));

        const pendingUserId = await AsyncStorage.getItem(PENDING_MIGRATION_KEY);
        if (pendingUserId === identity) {
          await AsyncStorage.multiRemove([GUEST_STORAGE_KEY, LEGACY_STORAGE_KEY, PENDING_MIGRATION_KEY]);
        }
        if (!cancelled) setSyncStatus('synced');
      } catch {
        if (!cancelled) setSyncStatus('offline');
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [authLoading, identity, loadedIdentity, records, replaceRecords, retryVersion, storageKey, token, user]);

  useEffect(() => {
    if (!token) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setRetryVersion((version) => version + 1);
    });
    return () => subscription.remove();
  }, [token]);

  const addAddress = useCallback((address: string) => {
    const id = createId();
    const updatedAt = nextTimestamp();
    const next = [...recordsRef.current, {
      id,
      address,
      placeName: '',
      notes: '',
      client: null,
      tags: [],
      updatedAt,
      deletedAt: null,
      position: recordsRef.current.reduce((max, record) => Math.max(max, record.position), -1) + 1,
    }];
    replaceRecords(next);
    return id;
  }, [replaceRecords]);

  const removeAddress = useCallback((id: string) => {
    replaceRecords(recordsRef.current.map((record) => (
      record.id === id ? (() => {
        const deletedAt = nextTimestamp(record.updatedAt);
        return { ...record, updatedAt: deletedAt, deletedAt };
      })() : record
    )));
  }, [replaceRecords]);

  const updateAddress = useCallback((id: string, patch: Partial<Omit<SavedAddress, 'id' | 'updatedAt' | 'deletedAt' | 'position'>>) => {
    replaceRecords(recordsRef.current.map((record) => (
      record.id === id ? { ...record, ...patch, updatedAt: nextTimestamp(record.updatedAt) } : record
    )));
  }, [replaceRecords]);

  const retrySync = useCallback(() => setRetryVersion((version) => version + 1), []);
  const addresses = useMemo(
    () => loadedIdentity === identity ? records.filter((record) => !record.deletedAt) : [],
    [identity, loadedIdentity, records],
  );

  return (
    <AddressBookContext.Provider
      value={{ addresses, syncStatus, retrySync, addAddress, removeAddress, updateAddress }}
    >
      {children}
    </AddressBookContext.Provider>
  );
}

export function useAddressBook(): AddressBookContextValue {
  const ctx = useContext(AddressBookContext);
  if (!ctx) {
    throw new Error('useAddressBook deve ser usado dentro de AddressBookProvider');
  }
  return ctx;
}
