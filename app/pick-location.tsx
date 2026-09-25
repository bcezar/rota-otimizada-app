import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';

import * as routesApi from '../src/api/routes';
import { useStops } from '../src/stops/StopsContext';

const FALLBACK_REGION: Region = {
  latitude: -22.9099,
  longitude: -47.0626,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const REVERSE_GEOCODE_DEBOUNCE_MS = 600;
// react-native-maps no iOS dispara onRegionChangeComplete várias vezes para a
// mesma posição (a câmera "assenta" em múltiplos passos); ignoramos deltas
// menores que isso para não estourar o rate limit de /api/v1/reverse.
const MIN_COORD_DELTA = 0.0001;

const TOAST_DURATION_MS = 1800;

export default function PickLocation() {
  const { stops, addStop } = useStops();
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedToast, setAddedToast] = useState(false);
  const [duplicateToast, setDuplicateToast] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const lastQueriedCoords = useRef<{ lat: number; lng: number } | null>(null);
  const addedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setInitialRegion(FALLBACK_REGION);
          return;
        }

        // Última posição em cache é instantânea — usamos como aproximação
        // imediata pra evitar tela em branco enquanto o GPS de precisão
        // (mais lento, sobretudo no simulador) ainda não respondeu.
        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown) {
          setInitialRegion({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setInitialRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch {
        setInitialRegion((current) => current ?? FALLBACK_REGION);
      }
    })();

    return () => {
      if (addedToastTimer.current) clearTimeout(addedToastTimer.current);
    };
  }, []);

  function handleRegionChangeComplete(region: Region) {
    const last = lastQueriedCoords.current;
    if (
      last &&
      Math.abs(last.lat - region.latitude) < MIN_COORD_DELTA &&
      Math.abs(last.lng - region.longitude) < MIN_COORD_DELTA
    ) {
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setIsLoading(true);
    setError('');
    setAddress('');
    setDuplicateToast(false);

    const thisRequestId = ++requestId.current;
    debounceTimer.current = setTimeout(async () => {
      lastQueriedCoords.current = { lat: region.latitude, lng: region.longitude };
      try {
        const res = await routesApi.reverseGeocode(region.latitude, region.longitude);
        if (requestId.current !== thisRequestId) return;
        setAddress(res.address);
      } catch {
        if (requestId.current !== thisRequestId) return;
        setError('Não foi possível identificar um endereço aqui.');
      } finally {
        if (requestId.current === thisRequestId) setIsLoading(false);
      }
    }, REVERSE_GEOCODE_DEBOUNCE_MS);
  }

  function confirmAdd() {
    addStop(address);
    if (addedToastTimer.current) clearTimeout(addedToastTimer.current);
    setAddedToast(true);
    addedToastTimer.current = setTimeout(() => setAddedToast(false), TOAST_DURATION_MS);
  }

  function handleConfirm() {
    if (!address) return;

    if (stops.some((stop) => stop.address === address)) {
      setDuplicateToast(true);
      return;
    }

    confirmAdd();
  }

  function handleAddAnyway() {
    setDuplicateToast(false);
    confirmAdd();
  }

  function handleDismissDuplicate() {
    setDuplicateToast(false);
  }

  if (!initialRegion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
      />
      <View pointerEvents="none" style={styles.pin}>
        <Text style={styles.pinEmoji}>📍</Text>
      </View>

      {addedToast ? (
        <View pointerEvents="none" style={styles.addedToast}>
          <Text style={styles.addedToastText}>Endereço adicionado</Text>
        </View>
      ) : null}

      {duplicateToast ? (
        <View style={styles.duplicateToast}>
          <Text style={styles.duplicateToastText}>Já adicionado. Adicionar de novo?</Text>
          <View style={styles.duplicateToastActions}>
            <Pressable style={styles.duplicateToastIconButton} onPress={handleDismissDuplicate}>
              <Text style={styles.duplicateToastIcon}>✕</Text>
            </Pressable>
            <Pressable style={styles.duplicateToastIconButton} onPress={handleAddAnyway}>
              <Text style={styles.duplicateToastIcon}>✓</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.addressText}>
          {isLoading ? 'Carregando...' : error || address || 'Arraste o mapa para escolher um local'}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Concluir</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, (isLoading || !address) && styles.buttonDisabled]}
            disabled={isLoading || !address}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Adicionar parada</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -16,
    marginTop: -32,
  },
  pinEmoji: {
    fontSize: 32,
  },
  addedToast: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 127, 60, 0.92)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
  },
  addedToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  duplicateToast: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    marginTop: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(13, 17, 32, 0.9)',
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 100,
    maxWidth: '90%',
  },
  duplicateToastText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  duplicateToastActions: {
    flexDirection: 'row',
    gap: 2,
  },
  duplicateToastIconButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplicateToastIcon: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  addressText: {
    minHeight: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
