import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import * as preferencesApi from '../api/preferences';
import type { UpdatePreferencesRequest, UserPreferencesResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';

const STORAGE_KEY = 'preferences';

export type NavigationApp = 'ask_always' | 'google_maps' | 'waze' | 'apple_maps';
export type DistanceUnit = 'km' | 'mi';
export type VehicleType = 'car' | 'truck' | 'motorcycle' | 'bicycle';
export type DestinationMode = 'return_to_origin' | 'custom' | 'none';

interface Preferences {
  defaultOrigin: string;
  defaultDestination: string;
  destinationMode: DestinationMode;
  navigationApp: NavigationApp;
  distanceUnit: DistanceUnit;
  vehicleType: VehicleType;
}

const DEFAULT_PREFERENCES: Preferences = {
  defaultOrigin: '',
  defaultDestination: '',
  destinationMode: 'none',
  navigationApp: 'ask_always',
  distanceUnit: 'km',
  vehicleType: 'car',
};

function fromApi(response: UserPreferencesResponse): Preferences {
  return {
    defaultOrigin: response.default_origin ?? '',
    defaultDestination: response.default_destination ?? '',
    destinationMode: response.destination_mode,
    navigationApp: response.navigation_app,
    distanceUnit: response.distance_unit,
    vehicleType: response.vehicle_type,
  };
}

interface PreferencesContextValue extends Preferences {
  setDefaultOrigin: (value: string) => void;
  setDefaultDestination: (value: string) => void;
  setDestinationMode: (mode: DestinationMode) => void;
  setNavigationApp: (value: NavigationApp) => void;
  setDistanceUnit: (value: DistanceUnit) => void;
  setVehicleType: (value: VehicleType) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const hasLoaded = useRef(false);

  // 1. Carrega o cache local (AsyncStorage) imediatamente — evita UI em
  // branco enquanto a rede responde.
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
        }
      } finally {
        hasLoaded.current = true;
      }
    })();
  }, []);

  // 2. Assim que logado, busca as preferências reais do servidor —
  // substitui o cache local e vira a fonte da verdade a partir daí.
  useEffect(() => {
    if (!token) return;
    preferencesApi
      .getPreferences(token)
      .then((res) => setPreferences(fromApi(res)))
      .catch(() => {
        // sem servidor disponível — mantém o cache local/defaults
      });
  }, [token]);

  useEffect(() => {
    if (!hasLoaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => {});
  }, [preferences]);

  function sync(fields: UpdatePreferencesRequest) {
    if (!token) return;
    preferencesApi.updatePreferences(token, fields).catch(() => {
      // falha silenciosa — a preferência já foi aplicada localmente/
      // otimisticamente; só não sincronizou com o servidor desta vez.
    });
  }

  function setDefaultOrigin(value: string) {
    setPreferences((prev) => ({ ...prev, defaultOrigin: value }));
    sync({ default_origin: value || null });
  }

  function setDefaultDestination(value: string) {
    setPreferences((prev) => ({ ...prev, defaultDestination: value }));
    sync({ default_destination: value || null });
  }

  function setDestinationMode(mode: DestinationMode) {
    setPreferences((prev) => ({
      ...prev,
      destinationMode: mode,
      defaultDestination: mode === 'none' ? '' : prev.defaultDestination,
    }));
    sync({
      destination_mode: mode,
      ...(mode === 'none' ? { default_destination: null } : {}),
    });
  }

  function setNavigationApp(value: NavigationApp) {
    setPreferences((prev) => ({ ...prev, navigationApp: value }));
    sync({ navigation_app: value });
  }

  function setDistanceUnit(value: DistanceUnit) {
    setPreferences((prev) => ({ ...prev, distanceUnit: value }));
    sync({ distance_unit: value });
  }

  function setVehicleType(value: VehicleType) {
    setPreferences((prev) => ({ ...prev, vehicleType: value }));
    sync({ vehicle_type: value });
  }

  return (
    <PreferencesContext.Provider
      value={{
        ...preferences,
        setDefaultOrigin,
        setDefaultDestination,
        setDestinationMode,
        setNavigationApp,
        setDistanceUnit,
        setVehicleType,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences deve ser usado dentro de PreferencesProvider');
  }
  return ctx;
}
