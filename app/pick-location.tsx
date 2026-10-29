import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import * as routesApi from '../src/api/routes';
import { usePreferences } from '../src/preferences/PreferencesContext';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

const FALLBACK_REGION: Region = {
  latitude: -22.9099,
  longitude: -47.0626,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const REVERSE_GEOCODE_DEBOUNCE_MS = 600;
// Ignora só o ruído de câmera sem esconder deslocamentos curtos para outra rua.
// 0.00001° representa aproximadamente 1 m de latitude.
const MIN_COORD_DELTA = 0.00001;

const TOAST_DURATION_MS = 1800;

export default function PickLocation() {
  const {
    stops,
    isHydrated,
    addStop,
    origin,
    destination,
    locationHint,
    setLocationHint,
    setInitialLocationHint,
  } = useStops();
  const { defaultOrigin, defaultDestination } = usePreferences();
  const initialReferenceAddress =
    stops[stops.length - 1]?.address.trim() ||
    origin.trim() || defaultOrigin.trim() || destination.trim() || defaultDestination.trim();
  const [currentLocationRegion, setCurrentLocationRegion] = useState<Region | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedToast, setAddedToast] = useState(false);
  const [duplicateToast, setDuplicateToast] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const lastQueriedCoords = useRef<{ lat: number; lng: number } | null>(null);
  const addedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const userMovedMap = useRef(false);
  const mapCenterInitialized = useRef(false);
  const locationHintRef = useRef(locationHint);
  locationHintRef.current = locationHint;

  useEffect(() => {
    if (!isHydrated || mapCenterInitialized.current) return;
    let cancelled = false;
    const previousHint = locationHintRef.current;
    const startAddress = initialReferenceAddress;

    function updateLocationRegion(latitude: number, longitude: number) {
      setCurrentLocationRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }

    async function initializeMapCenter() {
      if (previousHint) {
        mapCenterInitialized.current = true;
        updateLocationRegion(previousHint.lat, previousHint.lng);
        return;
      }

      if (startAddress) {
        try {
          const coordinates = await routesApi.geocode(startAddress);
          if (cancelled || userMovedMap.current) return;
          if (locationHintRef.current) {
            mapCenterInitialized.current = true;
            updateLocationRegion(locationHintRef.current.lat, locationHintRef.current.lng);
            return;
          }
          const initialCoords = { lat: coordinates.lat, lng: coordinates.lng };
          mapCenterInitialized.current = true;
          setInitialLocationHint(initialCoords);
          updateLocationRegion(initialCoords.lat, initialCoords.lng);
          return;
        } catch {
          // If the origin cannot be geocoded, fall back to the device location.
        }
      }

      if (cancelled || userMovedMap.current) return;
      try {
        if (locationHintRef.current) {
          mapCenterInitialized.current = true;
          updateLocationRegion(locationHintRef.current.lat, locationHintRef.current.lng);
          return;
        }
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown && !cancelled && !userMovedMap.current) {
          mapCenterInitialized.current = true;
          setInitialLocationHint({ lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude });
          updateLocationRegion(lastKnown.coords.latitude, lastKnown.coords.longitude);
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled && !userMovedMap.current) {
          mapCenterInitialized.current = true;
          setLocationHint({ lat: position.coords.latitude, lng: position.coords.longitude });
          updateLocationRegion(position.coords.latitude, position.coords.longitude);
        }
      } catch {
        // The map is already visible at FALLBACK_REGION; location is an enhancement.
      }
    }

    void initializeMapCenter();

    return () => {
      cancelled = true;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (addedToastTimer.current) clearTimeout(addedToastTimer.current);
    };
  }, [initialReferenceAddress, isHydrated]);

  useEffect(() => {
    if (!mapReady || !currentLocationRegion || userMovedMap.current) return;
    mapRef.current?.animateToRegion(currentLocationRegion, 450);
  }, [mapReady, currentLocationRegion]);

  function handleRegionChange(region: Region) {
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
        setAddressCoords({ lat: region.latitude, lng: region.longitude });
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
    if (addressCoords) setLocationHint(addressCoords);
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

  function handleFinish() {
    router.dismissTo('/otimizar');
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={
          locationHint
            ? { ...FALLBACK_REGION, latitude: locationHint.lat, longitude: locationHint.lng }
            : FALLBACK_REGION
        }
        onMapReady={() => setMapReady(true)}
        onPanDrag={() => { userMovedMap.current = true; }}
        onRegionChange={handleRegionChange}
        onRegionChangeComplete={handleRegionChange}
      />
      <View pointerEvents="none" style={styles.pin}>
        <Ionicons name="location-sharp" size={42} color={colors.accent} />
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
          <Pressable style={styles.cancelButton} onPress={handleFinish}>
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
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -21,
    marginTop: -42,
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
    backgroundColor: colors.surface,
  },
  addressText: {
    minHeight: 40,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
  },
});
