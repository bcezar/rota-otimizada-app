import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'address_book';

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
}

interface AddressBookContextValue {
  addresses: SavedAddress[];
  addAddress: (address: string) => string;
  removeAddress: (id: string) => void;
  updateAddress: (id: string, patch: Partial<Omit<SavedAddress, 'id'>>) => void;
}

const AddressBookContext = createContext<AddressBookContextValue | null>(null);

let nextId = 0;

export function AddressBookProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const hasLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: SavedAddress[] = JSON.parse(stored);
          setAddresses(parsed);
          nextId = parsed.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
        }
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(addresses)).catch(() => {});
  }, [addresses]);

  function addAddress(address: string): string {
    nextId += 1;
    const id = String(nextId);
    setAddresses((prev) => [
      ...prev,
      { id, address, placeName: '', notes: '', client: null, tags: [] },
    ]);
    return id;
  }

  function removeAddress(id: string) {
    setAddresses((prev) => prev.filter((item) => item.id !== id));
  }

  function updateAddress(id: string, patch: Partial<Omit<SavedAddress, 'id'>>) {
    setAddresses((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  return (
    <AddressBookContext.Provider
      value={{ addresses, addAddress, removeAddress, updateAddress }}
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
