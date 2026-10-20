import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStops } from '../../src/stops/StopsContext';
import { colors } from '../../src/theme/colors';

const FALLBACK_REGION: Region = {
  latitude: -22.9099,
  longitude: -47.0626,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function Navegacao() {
  const insets = useSafeAreaInsets();
  const { lastResult } = useStops();
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const mapRef = useRef<MapView | null>(null);

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
  }, []);

  // Quando houver uma rota otimizada, enquadra o mapa pra mostrar todos os
  // pins (paradas + origem/destino fixos, se houver) de uma vez.
  useEffect(() => {
    if (!lastResult || !mapRef.current) return;
    const coords = [
      ...lastResult.optimized_route.map((stop) => ({
        latitude: stop.coordinates.lat,
        longitude: stop.coordinates.lng,
      })),
      ...(lastResult.origin
        ? [
            {
              latitude: lastResult.origin.coordinates.lat,
              longitude: lastResult.origin.coordinates.lng,
            },
          ]
        : []),
      ...(lastResult.destination
        ? [
            {
              latitude: lastResult.destination.coordinates.lat,
              longitude: lastResult.destination.coordinates.lng,
            },
          ]
        : []),
    ];
    if (coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 60, bottom: 80, left: 60 },
      animated: true,
    });
  }, [lastResult]);

  if (!initialRegion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {lastResult?.origin ? (
          <Marker
            coordinate={{
              latitude: lastResult.origin.coordinates.lat,
              longitude: lastResult.origin.coordinates.lng,
            }}
          >
            <View style={[styles.pinBadge, styles.pinBadgeFixed]}>
              <Text style={styles.pinBadgeText}>0</Text>
            </View>
          </Marker>
        ) : null}

        {lastResult?.optimized_route.map((stop) => (
          <Marker
            key={stop.order}
            coordinate={{
              latitude: stop.coordinates.lat,
              longitude: stop.coordinates.lng,
            }}
          >
            <View style={styles.pinBadge}>
              <Text style={styles.pinBadgeText}>{stop.order}</Text>
            </View>
          </Marker>
        ))}

        {lastResult?.destination ? (
          <Marker
            coordinate={{
              latitude: lastResult.destination.coordinates.lat,
              longitude: lastResult.destination.coordinates.lng,
            }}
          >
            <View style={[styles.pinBadge, styles.pinBadgeFixed]}>
              <Text style={styles.pinBadgeText}>F</Text>
            </View>
          </Marker>
        ) : null}
      </MapView>

      <Pressable
        style={[styles.searchBar, { top: insets.top + 12 }]}
        onPress={() => router.push('/otimizar')}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>Para onde vamos?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    flex: 1,
  },
  pinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.onAccent,
  },
  pinBadgeFixed: {
    backgroundColor: colors.textMuted,
  },
  pinBadgeText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 12,
  },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  searchPlaceholder: {
    color: colors.textMuted,
    fontSize: 15,
  },
});
