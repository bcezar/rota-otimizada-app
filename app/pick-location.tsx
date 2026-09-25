import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function PickLocation() {
  const { addStop } = useStops();
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const lastQueriedCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setInitialRegion(FALLBACK_REGION);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        setInitialRegion({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch {
        setInitialRegion(FALLBACK_REGION);
      }
    })();
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

  function handleConfirm() {
    if (!address) return;
    addStop(address);
    router.back();
  }

  if (!initialRegion) {
    return <View style={styles.container} />;
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

      <View style={styles.footer}>
        <Text style={styles.addressText}>
          {isLoading ? 'Carregando...' : error || address || 'Arraste o mapa para escolher um local'}
        </Text>
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.confirmButton, (isLoading || !address) && styles.buttonDisabled]}
            disabled={isLoading || !address}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Confirmar</Text>
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
