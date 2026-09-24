import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { RouteResponse } from '../api/types';

const STORAGE_KEY = 'stops';

export interface Stop {
  id: string;
  address: string;
}

interface StopsContextValue {
  stops: Stop[];
  addStop: (address: string) => void;
  removeStop: (id: string) => void;
  lastResult: RouteResponse | null;
  setLastResult: (result: RouteResponse | null) => void;
}

const StopsContext = createContext<StopsContextValue | null>(null);

let nextId = 0;

export function StopsProvider({ children }: { children: ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [lastResult, setLastResult] = useState<RouteResponse | null>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Stop[] = JSON.parse(stored);
          setStops(parsed);
          nextId = parsed.reduce((max, stop) => Math.max(max, Number(stop.id) || 0), 0);
        }
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stops)).catch(() => {});
  }, [stops]);

  function addStop(address: string) {
    nextId += 1;
    setStops((prev) => [...prev, { id: String(nextId), address }]);
  }

  function removeStop(id: string) {
    setStops((prev) => prev.filter((stop) => stop.id !== id));
  }

  return (
    <StopsContext.Provider value={{ stops, addStop, removeStop, lastResult, setLastResult }}>
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
