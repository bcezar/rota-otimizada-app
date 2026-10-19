import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import type { Coordinates, RouteResponse } from '../api/types';

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
  fixedFirst: string | null;
  fixedLast: string | null;
}

interface StopsContextValue {
  stops: Stop[];
  addStop: (address: string) => void;
  addStops: (items: { address: string; description: string }[], mode: 'add' | 'replace') => void;
  removeStop: (id: string) => void;
  updateStopDescription: (id: string, description: string) => void;
  clearAll: () => void;
  origin: string;
  setOrigin: (value: string) => void;
  destination: string;
  setDestination: (value: string) => void;
  fixedFirst: string | null;
  toggleFixedFirst: (address: string) => void;
  fixedLast: string | null;
  toggleFixedLast: (address: string) => void;
  locationHint: Coordinates | null;
  setLocationHint: (coords: Coordinates) => void;
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
      fixedFirst: null,
      fixedLast: null,
    };
  }
  return {
    stops: (parsed.stops ?? []).map((stop: Stop) => ({ ...stop, description: stop.description ?? '' })),
    origin: parsed.origin ?? '',
    destination: parsed.destination ?? '',
    fixedFirst: parsed.fixedFirst ?? null,
    fixedLast: parsed.fixedLast ?? null,
  };
}

export function StopsProvider({ children }: { children: ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [fixedFirst, setFixedFirst] = useState<string | null>(null);
  const [fixedLast, setFixedLast] = useState<string | null>(null);
  // Não persistido — só serve de bias para o autocomplete durante a sessão
  // atual, igual ao locationHint do site (que se auto-ajusta pelo 1º endereço
  // confirmado em qualquer campo: parada, origem, destino ou mapa).
  const [locationHint, setLocationHintState] = useState<Coordinates | null>(null);
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
          setFixedFirst(parsed.fixedFirst);
          setFixedLast(parsed.fixedLast);
          nextId = parsed.stops.reduce((max, stop) => Math.max(max, Number(stop.id) || 0), 0);
        }
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    const state: PersistedState = { stops, origin, destination, fixedFirst, fixedLast };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [stops, origin, destination, fixedFirst, fixedLast]);

  function addStop(address: string) {
    nextId += 1;
    setStops((prev) => [...prev, { id: String(nextId), address, description: '' }]);
  }

  function addStops(items: { address: string; description: string }[], mode: 'add' | 'replace') {
    const newStops: Stop[] = items.map((item) => {
      nextId += 1;
      return { id: String(nextId), address: item.address, description: item.description };
    });
    setStops((prev) => (mode === 'replace' ? newStops : [...prev, ...newStops]));
  }

  function removeStop(id: string) {
    const removed = stops.find((stop) => stop.id === id);
    setStops((prev) => prev.filter((stop) => stop.id !== id));
    if (removed) {
      setFixedFirst((prev) => (prev === removed.address ? null : prev));
      setFixedLast((prev) => (prev === removed.address ? null : prev));
    }
  }

  function updateStopDescription(id: string, description: string) {
    setStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, description } : stop)));
  }

  function toggleFixedFirst(address: string) {
    setFixedFirst((prev) => (prev === address ? null : address));
    setFixedLast((prev) => (prev === address ? null : prev));
  }

  function toggleFixedLast(address: string) {
    setFixedLast((prev) => (prev === address ? null : address));
    setFixedFirst((prev) => (prev === address ? null : prev));
  }

  function setLocationHint(coords: Coordinates) {
    // Replica o site: só fixa a dica uma vez por sessão (primeiro endereço
    // confirmado), para manter o bias estável enquanto o usuário monta a rota.
    setLocationHintState((prev) => prev ?? coords);
  }

  function clearAll() {
    setStops([]);
    setOrigin('');
    setDestination('');
    setFixedFirst(null);
    setFixedLast(null);
    setLocationHintState(null);
    setLastResult(null);
  }

  return (
    <StopsContext.Provider
      value={{
        stops,
        addStop,
        addStops,
        removeStop,
        updateStopDescription,
        clearAll,
        origin,
        setOrigin,
        destination,
        setDestination,
        fixedFirst,
        toggleFixedFirst,
        fixedLast,
        toggleFixedLast,
        locationHint,
        setLocationHint,
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
