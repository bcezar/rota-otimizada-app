import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { RouteResponse } from '../api/types';

const STORAGE_KEY = 'stops';

export interface Stop {
  id: string;
  address: string;
  description: string;
}

interface PersistedState {
  stops: Stop[];
  origin: string;
  destination: string;
}

interface StopsContextValue {
  stops: Stop[];
  addStop: (address: string) => void;
  removeStop: (id: string) => void;
  updateStopDescription: (id: string, description: string) => void;
  clearAll: () => void;
  origin: string;
  setOrigin: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  lastResult: RouteResponse | null;
  setLastResult: (result: RouteResponse | null) => void;
}

const StopsContext = createContext<StopsContextValue | null>(null);

let nextId = 0;

function parsePersisted(raw: string): PersistedState {
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    // formato antigo: só o array de stops, sem description/origin/destination
    return {
      stops: parsed.map((stop: { id: string; address: string }) => ({
        ...stop,
        description: '',
      })),
      origin: '',
      destination: '',
    };
  }
  return {
    stops: (parsed.stops ?? []).map((stop: Stop) => ({ ...stop, description: stop.description ?? '' })),
    origin: parsed.origin ?? '',
    destination: parsed.destination ?? '',
  };
}

export function StopsProvider({ children }: { children: ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [lastResult, setLastResult] = useState<RouteResponse | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parsePersisted(stored);
          setStops(parsed.stops);
          setOrigin(parsed.origin);
          setDestination(parsed.destination);
          nextId = parsed.stops.reduce((max, stop) => Math.max(max, Number(stop.id) || 0), 0);
        }
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    const state: PersistedState = { stops, origin, destination };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [stops, origin, destination]);

  function addStop(address: string) {
    nextId += 1;
    setStops((prev) => [...prev, { id: String(nextId), address, description: '' }]);
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((stop) => stop.id !== id));
  }

  function updateStopDescription(id: string, description: string) {
    setStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, description } : stop)));
  }

  function clearAll() {
    setStops([]);
    setOrigin('');
    setDestination('');
    setLastResult(null);
  }

  return (
    <StopsContext.Provider
      value={{
        stops,
        addStop,
        removeStop,
        updateStopDescription,
        clearAll,
        origin,
        setOrigin,
        destination,
        setDestination,
        lastResult,
        setLastResult,
      }}
    >
      {children}
    </StopsContext.Provider>
  );
}

export function useStops(): StopsContextValue {
  const ctx = useContext(StopsContext);
  if (!ctx) {
    throw new Error('useStops deve ser usado dentro de StopsProvider');
  }
  return ctx;
}
