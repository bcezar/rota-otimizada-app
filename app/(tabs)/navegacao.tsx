import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker, Polyline, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAddressBook } from '../../src/addressBook/AddressBookContext';
import * as routesApi from '../../src/api/routes';
import * as savedRoutesApi from '../../src/api/savedRoutes';
import type { Coordinates, SavedRouteStopDetails } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { OptionSheet } from '../../src/components/OptionSheet';
import { usePreferences } from '../../src/preferences/PreferencesContext';
import { useStops } from '../../src/stops/StopsContext';
import { formatRouteText } from '../../src/stops/formatRoute';
import { mapRouteStopsToLocalStops } from '../../src/stops/routeStopMapping';
import { colors } from '../../src/theme/colors';

const FALLBACK_REGION: Region = {
  latitude: -22.9099,
  longitude: -47.0626,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

type RoutePanelLevel = 15 | 50 | 96;
const ROUTE_PANEL_LEVELS: RoutePanelLevel[] = [15, 50, 96];

function routePanelHeightForLevel(level: RoutePanelLevel, availableHeight: number) {
  const visualPercentage = level === 96 ? 90 : level;
  return availableHeight * visualPercentage / 100;
}

export default function Navegacao() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = useState(windowHeight);
  const {
    stops,
    origin,
    destination,
    destinationMode,
    fixedFirst,
    fixedLast,
    lastResult,
    removeStop,
    setLastResult,
    isNavigationStarted,
    activeStopOrder,
    routeStopStatuses,
    startNavigation,
    restartNavigation,
    selectRouteStop,
    markRouteStop,
    resetNavigation,
  } = useStops();
  const { token } = useAuth();
  const { addresses, addAddress, updateAddress } = useAddressBook();
  const { navigationApp } = usePreferences();
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const [polyline, setPolyline] = useState<Coordinates[] | null>(null);
  const [isPolylineLoading, setIsPolylineLoading] = useState(false);
  const [polylineError, setPolylineError] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [navigationAppVisible, setNavigationAppVisible] = useState(false);
  const [routeActionsVisible, setRouteActionsVisible] = useState(false);
  const [saveRouteVisible, setSaveRouteVisible] = useState(false);
  const [saveRouteName, setSaveRouteName] = useState('');
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [routePanelLevel, setRoutePanelLevel] = useState<RoutePanelLevel>(50);
  const mapRef = useRef<MapView | null>(null);
  const stopListRef = useRef<ScrollView | null>(null);
  const stopRowOffsets = useRef<Record<number, number>>({});
  const stopIdsByOrder = useMemo(
    () => mapRouteStopsToLocalStops(lastResult?.optimized_route ?? [], stops),
    [lastResult, stops],
  );
  const orderedStops = useMemo(
    () => lastResult?.optimized_route.slice().sort((a, b) => a.order - b.order) ?? [],
    [lastResult],
  );
  const activeStop = orderedStops.find((stop) => stop.order === activeStopOrder) ?? null;
  const activeLocalStop = activeStop ? stops.find((stop) => stop.id === stopIdsByOrder[activeStop.order]) : null;
  const routePanelHeight = routePanelHeightForLevel(routePanelLevel, availableHeight);
  const routePanelHeightAnimation = useRef(new Animated.Value(routePanelHeight)).current;
  const routePanelGestureStartHeight = useRef(routePanelHeight);
  const compactPanelStop = activeStop ??
    orderedStops.find((stop) => !routeStopStatuses[stop.order]) ??
    (isNavigationStarted ? orderedStops[orderedStops.length - 1] : orderedStops[0]) ??
    null;
  const visibleStops = routePanelLevel === 15
    ? compactPanelStop ? [compactPanelStop] : []
    : orderedStops;
  const routePanelPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderGrant: () => {
        routePanelHeightAnimation.stopAnimation((value) => {
          routePanelGestureStartHeight.current = value;
        });
      },
      onPanResponderMove: (_event, gesture) => {
        const nextHeight = routePanelGestureStartHeight.current - gesture.dy;
        routePanelHeightAnimation.setValue(
          Math.max(availableHeight * 0.15, Math.min(availableHeight * 0.9, nextHeight)),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const projectedHeight =
          routePanelGestureStartHeight.current - gesture.dy - gesture.vy * 120;
        const nextLevel = ROUTE_PANEL_LEVELS.reduce((nearest, candidate) =>
          Math.abs(routePanelHeightForLevel(candidate, availableHeight) - projectedHeight) <
            Math.abs(routePanelHeightForLevel(nearest, availableHeight) - projectedHeight)
            ? candidate
            : nearest,
        );
        setRoutePanelLevel(nextLevel);
        if (nextLevel === 15 || nextLevel === 50) {
          stopListRef.current?.scrollTo({ y: 0, animated: true });
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(routePanelHeightAnimation, {
          toValue: routePanelHeight,
          useNativeDriver: false,
          damping: 24,
          stiffness: 220,
        }).start();
      },
    }),
    [routePanelHeight, availableHeight, routePanelHeightAnimation],
  );

  useEffect(() => {
    const animation = Animated.spring(routePanelHeightAnimation, {
      toValue: routePanelHeight,
      useNativeDriver: false,
      damping: 24,
      stiffness: 220,
    });
    animation.start();
    return () => animation.stop();
  }, [routePanelHeight, routePanelHeightAnimation]);

  async function performRouteReverse() {
    if (!lastResult) return;
    setRouteActionsVisible(false);
    try {
      const reversedStops = orderedStops.slice().reverse();
      const reversedIds = reversedStops.map((stop) => stopIdsByOrder[stop.order]);
      const result = await routesApi.optimizeRoute(
        reversedStops.map((stop) => stop.original_address),
        token,
        lastResult.destination?.address,
        lastResult.origin?.address,
        null,
        null,
        reversedIds.every(Boolean) ? reversedIds : undefined,
        true,
      );
      setLastResult(result);
      resetNavigation();
    } catch (error) {
      Alert.alert(
        'Não foi possível inverter a rota',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    }
  }

  function confirmRouteReverse() {
    Alert.alert(
      'Inverter rota?',
      'A ordem das paradas e o trajeto serão recalculados. O progresso de visitas será reiniciado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Inverter rota', onPress: () => void performRouteReverse() },
      ],
    );
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setInitialRegion(FALLBACK_REGION);
          return;
        }

        const lastKnown = await Location.getLastKnownPositionAsync({});
        if (lastKnown && !cancelled) {
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
        if (!cancelled) {
          setInitialRegion({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch {
        if (!cancelled) setInitialRegion((current) => current ?? FALLBACK_REGION);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const points: Coordinates[] = lastResult
      ? [
          ...(lastResult.origin ? [lastResult.origin.coordinates] : []),
          ...orderedStops.map((stop) => stop.coordinates),
          ...(lastResult.destination ? [lastResult.destination.coordinates] : []),
        ]
      : [];

    setPolyline(null);
    setPolylineError(false);
    if (points.length < 2) {
      setIsPolylineLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsPolylineLoading(true);
    routesApi
      .getRoutePolyline(points)
      .then((result) => {
        if (!cancelled) setPolyline(result.path);
      })
      .catch(() => {
        if (!cancelled) setPolylineError(true);
      })
      .finally(() => {
        if (!cancelled) setIsPolylineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lastResult, orderedStops]);

  useEffect(() => {
    setRoutePanelLevel(50);
  }, [lastResult]);

  useEffect(() => {
    if (!lastResult || !mapRef.current || !initialRegion || routePanelLevel === 96) return;
    const coords = [
      ...orderedStops.map((stop) => ({
        latitude: stop.coordinates.lat,
        longitude: stop.coordinates.lng,
      })),
      ...(lastResult.origin
        ? [{
            latitude: lastResult.origin.coordinates.lat,
            longitude: lastResult.origin.coordinates.lng,
          }]
        : []),
      ...(lastResult.destination
        ? [{
            latitude: lastResult.destination.coordinates.lat,
            longitude: lastResult.destination.coordinates.lng,
          }]
        : []),
    ];
    if (coords.length > 0) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: {
          top: 70,
          right: 50,
          bottom: Math.min(routePanelHeight, availableHeight * 0.65),
          left: 50,
        },
        animated: true,
      });
    }
  }, [lastResult, initialRegion, orderedStops, routePanelLevel, routePanelHeight, availableHeight]);

  useEffect(() => {
    if (!isNavigationStarted || activeStopOrder == null || !mapRef.current || routePanelLevel === 96) return;
    const stop = orderedStops.find((item) => item.order === activeStopOrder);
    if (!stop) return;
    const latitudeDelta = 0.018;
    mapRef.current.animateToRegion(
      {
        latitude: stop.coordinates.lat - latitudeDelta * routePanelHeight / (2 * availableHeight),
        longitude: stop.coordinates.lng,
        latitudeDelta,
        longitudeDelta: 0.018,
      },
      500,
    );
  }, [activeStopOrder, isNavigationStarted, orderedStops, routePanelLevel, routePanelHeight, availableHeight]);

  useEffect(() => {
    if (!isNavigationStarted || activeStopOrder == null) return;
    const offset = stopRowOffsets.current[activeStopOrder];
    if (offset != null) {
      stopListRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
    }
  }, [activeStopOrder, isNavigationStarted, orderedStops.length]);

  function handleEditStop() {
    if (!activeStop) return;
    openStopDetails(activeStop.order);
  }

  function openStopDetails(order: number) {
    const id = stopIdsByOrder[order];
    if (!id) {
      Alert.alert('Parada não encontrada', 'Não foi possível abrir os detalhes desta parada.');
      return;
    }
    router.push({ pathname: '/stop-detail', params: { id, source: 'navigation' } });
  }

  function handleSaveAddress() {
    if (!activeStop) return;
    const id = addAddress(activeStop.original_address);
    if (activeLocalStop) {
      updateAddress(id, {
        placeName: activeLocalStop.placeName,
        notes: activeLocalStop.description,
        client: activeLocalStop.client,
        tags: activeLocalStop.tags,
      });
    }
    Alert.alert('Endereço salvo', 'A parada foi adicionada à sua lista de endereços.');
  }

  function handleRemoveAndReoptimize() {
    if (!activeStop) return;
    const id = stopIdsByOrder[activeStop.order];
    if (!id) {
      Alert.alert('Parada não encontrada', 'Não foi possível remover esta ocorrência da rota.');
      return;
    }
    removeStop(id);
    setLastResult(null);
    resetNavigation();
    setDeleteVisible(false);
    router.navigate('/otimizar');
  }

  function handleCancelRoute() {
    setLastResult(null);
    resetNavigation();
  }

  async function openNavigationApp(app: 'google_maps' | 'waze' | 'apple_maps') {
    if (!activeStop) return;
    const { lat, lng } = activeStop.coordinates;
    const url =
      app === 'waze'
        ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`
        : app === 'apple_maps'
          ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`
          : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Não foi possível abrir o aplicativo de navegação.');
    }
  }

  function handleNavigate() {
    if (!activeStop) return;
    if (navigationApp === 'ask_always') {
      setNavigationAppVisible(true);
      return;
    }
    if (navigationApp === 'apple_maps' && Platform.OS === 'android') {
      Alert.alert(
        'Apple Maps indisponível',
        'No Android, escolha Google Maps ou Waze para navegar até esta parada.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Google Maps', onPress: () => void openNavigationApp('google_maps') },
          { text: 'Waze', onPress: () => void openNavigationApp('waze') },
        ],
      );
      return;
    }
    void openNavigationApp(navigationApp);
  }

  async function shareRoute() {
    if (!lastResult) return;
    try {
      await Share.share({ message: formatRouteText(lastResult, stops) });
    } catch {
      // O usuário pode fechar o menu de compartilhamento sem enviar.
    }
  }

  async function copyRoute() {
    if (!lastResult) return;
    await Clipboard.setStringAsync(formatRouteText(lastResult, stops));
    Alert.alert('Rota copiada', 'O resumo da rota foi copiado.');
  }

  const settingsOptions = [
    { label: 'Editar', onPress: handleEditStop },
    {
      label: 'Pular',
      onPress: () => activeStop && markRouteStop(activeStop.order, 'failed'),
    },
    { label: 'Salvar na lista de endereços', onPress: handleSaveAddress },
    { label: 'Excluir', onPress: () => setDeleteVisible(true) },
  ];

  const deleteOptions = [
    { label: 'Otimizar a rota novamente', onPress: handleRemoveAndReoptimize },
    {
      label: 'Apenas pular a visita',
      onPress: () => activeStop && markRouteStop(activeStop.order, 'failed'),
    },
  ];

  const navigationOptions = [
    { label: 'Google Maps', onPress: () => void openNavigationApp('google_maps') },
    { label: 'Waze', onPress: () => void openNavigationApp('waze') },
    ...(Platform.OS === 'ios'
      ? [{ label: 'Apple Maps', onPress: () => void openNavigationApp('apple_maps') }]
      : []),
  ];

  const routeActionOptions = [
    { label: 'Editar rota', onPress: () => router.navigate('/otimizar') },
    { label: 'Salvar rota', onPress: openSaveRoute },
    { label: 'Rotas salvas', onPress: () => router.push('/saved-routes') },
    { label: 'Reiniciar rota', onPress: restartNavigation },
    { label: 'Inverter rota', onPress: confirmRouteReverse },
    { label: 'Ajustar ordem', onPress: () => router.push('/reorder-route') },
    { label: 'Cancelar rota', onPress: handleCancelRoute },
    { label: 'Compartilhar rota', onPress: () => void shareRoute() },
    { label: 'Copiar rota', onPress: () => void copyRoute() },
    ...(lastResult?.maps_url
      ? [{ label: 'Abrir rota completa no Google Maps', onPress: () => void Linking.openURL(lastResult.maps_url!) }]
      : []),
  ];

  function openSaveRoute() {
    if (!lastResult) return;
    if (!token) {
      Alert.alert(
        'Entre para salvar a rota',
        'As rotas salvas ficam na sua conta e podem ser acessadas em outros dispositivos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Entrar', onPress: () => router.push('/login') },
        ],
      );
      return;
    }
    setSaveRouteName(`Rota ${new Date().toLocaleDateString('pt-BR')}`);
    setSaveRouteVisible(true);
  }

  async function handleSaveRoute() {
    if (!lastResult || !token || !saveRouteName.trim()) return;
    setIsSavingRoute(true);
    try {
      const stopDetails: SavedRouteStopDetails[] = orderedStops.map((routeStop, index) => {
        const localStopId = stopIdsByOrder[routeStop.order] ?? routeStop.stop_id ?? `saved-${Date.now()}-${index}`;
        const localStop = stops.find((stop) => stop.id === localStopId);
        return {
          id: localStopId,
          address: routeStop.original_address,
          description: localStop?.description ?? '',
          place_name: localStop?.placeName ?? '',
          client: localStop?.client ?? null,
          tags: localStop?.tags ?? [],
        };
      });
      await savedRoutesApi.saveRoute(
        saveRouteName.trim(),
        lastResult,
        {
          addresses: stopDetails.map((stop) => stop.address),
          origin: lastResult.origin?.address ?? origin ?? undefined,
          destination: lastResult.destination?.address ?? destination ?? undefined,
          fixed_first: fixedFirst ?? undefined,
          fixed_last: fixedLast ?? undefined,
          stop_ids: stopDetails.map((stop) => stop.id),
          preserve_order: false,
        },
        stopDetails,
        destinationMode,
        token,
      );
      setSaveRouteVisible(false);
      setRouteActionsVisible(false);
      Alert.alert('Rota salva', 'Você poderá acessá-la em Rotas salvas.');
    } catch (cause) {
      Alert.alert('Não foi possível salvar', cause instanceof Error ? cause.message : 'Tente novamente.');
    } finally {
      setIsSavingRoute(false);
    }
  }

  if (!initialRegion) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}
    >
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {polyline?.length ? (
          <Polyline
            coordinates={polyline.map((point) => ({
              latitude: point.lat,
              longitude: point.lng,
            }))}
            strokeColor={colors.accent}
            strokeWidth={5}
            zIndex={1}
          />
        ) : null}

        {lastResult?.origin ? (
          <Marker
            coordinate={{
              latitude: lastResult.origin.coordinates.lat,
              longitude: lastResult.origin.coordinates.lng,
            }}
          >
            <View style={[styles.pinBadge, styles.pinBadgeFixed]}>
              <Ionicons name="home" size={14} color={colors.onAccent} />
            </View>
          </Marker>
        ) : null}

        {orderedStops.map((stop) => {
          const status = routeStopStatuses[stop.order];
          const isActive = isNavigationStarted && activeStopOrder === stop.order;
          return (
            <Marker
              key={stop.order}
              coordinate={{ latitude: stop.coordinates.lat, longitude: stop.coordinates.lng }}
              zIndex={isActive ? 10 : 1}
              onPress={() => {
                if (isNavigationStarted) {
                  selectRouteStop(stop.order);
                  if (routePanelLevel === 15) setRoutePanelLevel(50);
                } else {
                  openStopDetails(stop.order);
                }
              }}
            >
              <View
                style={[
                  styles.pinBadge,
                  isActive && styles.pinBadgeActive,
                  status === 'visited' && styles.pinBadgeVisited,
                  status === 'failed' && styles.pinBadgeFailed,
                ]}
              >
                <Text style={styles.pinBadgeText}>{stop.order}</Text>
              </View>
            </Marker>
          );
        })}

        {lastResult?.destination ? (
          <Marker
            coordinate={{
              latitude: lastResult.destination.coordinates.lat,
              longitude: lastResult.destination.coordinates.lng,
            }}
          >
            <View style={[styles.pinBadge, styles.pinBadgeFixed]}>
              <Ionicons name="flag" size={14} color={colors.onAccent} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <Pressable
        style={[styles.searchBar, { top: insets.top + 10 }]}
        onPress={() => router.navigate('/otimizar')}
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder}>
          {lastResult ? 'Editar rota' : 'Para onde vamos?'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Rotas salvas"
        style={[styles.savedRoutesButton, { top: insets.top + 10 }]}
        onPress={() => router.push('/saved-routes')}
      >
        <Ionicons name="bookmark-outline" size={20} color={colors.text} />
      </Pressable>

      {lastResult ? (
        <Animated.View
          style={[
            styles.routePanel,
            {
              height: routePanelHeightAnimation,
              maxHeight: availableHeight,
              paddingBottom: routePanelLevel === 15 ? 3 : 12,
            },
            routePanelLevel === 15 && styles.routePanelCompact,
          ]}
        >
          <View
            accessible
            accessibilityLabel="Arraste para expandir ou recolher o painel da rota"
            accessibilityHint={`Arraste para mudar o painel de ${routePanelLevel}%`}
            {...routePanelPanResponder.panHandlers}
            style={[
              styles.dragHandlePressable,
              routePanelLevel === 15 && styles.dragHandlePressableCompact,
            ]}
          >
            <View style={styles.dragHandle} />
          </View>
          {routePanelLevel === 50 ? (
            <View style={styles.routeHeader}>
              <View style={styles.routeHeaderText}>
                <Text style={styles.routeTitle}>Rota otimizada</Text>
                <Text style={styles.routeSummary}>
                  {orderedStops.length} {orderedStops.length === 1 ? 'parada' : 'paradas'}
                  {' · '}{lastResult.total_distance_km.toFixed(1)} km
                  {lastResult.total_duration_min != null
                    ? ` · ${Math.round(lastResult.total_duration_min)} min`
                    : ''}
                </Text>
              </View>
              {isPolylineLoading ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : null}
              <Pressable
                accessibilityLabel="Mais opções da rota"
                style={styles.headerAction}
                onPress={() => setRouteActionsVisible(true)}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {polylineError && routePanelLevel === 50 ? (
            <Text style={styles.polylineError}>Traçado indisponível; exibindo os pontos da rota.</Text>
          ) : null}

          {!isNavigationStarted && routePanelLevel === 50 ? (
            <Pressable style={styles.startButton} onPress={startNavigation}>
              <Text style={styles.startButtonText}>Iniciar Rota</Text>
            </Pressable>
          ) : null}

          <ScrollView
            ref={stopListRef}
            style={[
              styles.stopList,
              routePanelLevel === 15
                ? styles.stopListCompact
                : routePanelLevel === 96
                  ? styles.stopListExpanded
                  : styles.stopListDefault,
            ]}
            contentContainerStyle={styles.stopListContent}
            showsVerticalScrollIndicator
          >
            {lastResult.origin && routePanelLevel !== 15 ? (
              <View style={styles.endpointRow}>
                <Ionicons name="home" size={18} color={colors.accent} />
                <View style={styles.stopCopy}>
                  <Text style={styles.stopAddress}>{lastResult.origin.address}</Text>
                  <Text style={styles.stopCaption}>Ponto de partida</Text>
                </View>
              </View>
            ) : null}

            {visibleStops.map((stop) => {
              const localStop = stops.find((item) => item.id === stopIdsByOrder[stop.order]);
              const status = routeStopStatuses[stop.order];
              const isActive = isNavigationStarted && activeStopOrder === stop.order;
              const isPast = isNavigationStarted && !!status && !isActive;
              return (
                <View
                  key={stop.order}
                  style={[
                    routePanelLevel === 15 && styles.compactStopCard,
                    isActive && routePanelLevel !== 15 && styles.activeStopGroup,
                  ]}
                  onLayout={(event) => {
                    stopRowOffsets.current[stop.order] = event.nativeEvent.layout.y;
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      if (isNavigationStarted) {
                        selectRouteStop(stop.order);
                        if (routePanelLevel === 15) setRoutePanelLevel(50);
                      } else {
                        openStopDetails(stop.order);
                      }
                    }}
                    style={[
                      styles.stopRow,
                      routePanelLevel === 15 && styles.stopRowCompact,
                      isActive && routePanelLevel !== 15 && styles.stopRowActive,
                      isPast && styles.stopRowPast,
                      status === 'failed' && styles.stopRowFailed,
                    ]}
                  >
                    <View
                      style={[
                        styles.orderBadge,
                        isActive && routePanelLevel !== 15 && styles.orderBadgeActive,
                        status === 'visited' && styles.orderBadgeVisited,
                        status === 'failed' && styles.orderBadgeFailed,
                      ]}
                    >
                      <Text style={styles.orderText}>{stop.order}</Text>
                    </View>
                    <View style={styles.stopCopy}>
                      <Text
                        style={[
                          styles.stopAddress,
                          routePanelLevel === 15 && styles.stopAddressCompact,
                          isActive && routePanelLevel !== 15 && styles.stopAddressActive,
                          isPast && styles.stopAddressPast,
                          status === 'failed' && styles.stopAddressFailed,
                        ]}
                      >
                        {localStop?.placeName || stop.original_address}
                      </Text>
                      {localStop?.placeName && routePanelLevel !== 15 ? (
                        <Text style={styles.stopCaption}>{stop.original_address}</Text>
                      ) : null}
                      {routePanelLevel !== 15 && status === 'failed' ? (
                        <Text style={styles.failedLabel}>Falhada</Text>
                      ) : routePanelLevel !== 15 && status === 'visited' ? (
                        <Text style={styles.visitedLabel}>Visitada</Text>
                      ) : null}
                    </View>
                    {stop.leg_distance_km != null && routePanelLevel !== 15 ? (
                      <Text style={styles.legDistance}>{stop.leg_distance_km.toFixed(1)} km</Text>
                    ) : null}
                    {routePanelLevel !== 15 ? (
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    ) : null}
                  </Pressable>
                  {isActive ? (
                    <View
                      style={[
                        styles.activeActions,
                        routePanelLevel === 15 && styles.activeActionsCompact,
                      ]}
                    >
                      <Pressable
                        accessibilityLabel="Opções da parada"
                        style={[
                          styles.settingsButton,
                          routePanelLevel === 15 && styles.settingsButtonCompact,
                        ]}
                        onPress={() => setSettingsVisible(true)}
                      >
                        <Ionicons name="settings-outline" size={23} color={colors.text} />
                      </Pressable>
                      <Pressable
                        style={[
                          styles.navigateButton,
                          routePanelLevel === 15 && styles.actionButtonCompact,
                        ]}
                        onPress={handleNavigate}
                      >
                        <Ionicons name="navigate" size={18} color={colors.onAccent} />
                        <Text
                          style={[
                            styles.navigateButtonText,
                            routePanelLevel === 15 && styles.actionButtonTextCompact,
                          ]}
                        >
                          Navegar
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.visitedButton,
                          routePanelLevel === 15 && styles.actionButtonCompact,
                        ]}
                        onPress={() => markRouteStop(stop.order, 'visited')}
                      >
                        <Ionicons name="checkmark" size={18} color={colors.success} />
                        <Text
                          style={[
                            styles.visitedButtonText,
                            routePanelLevel === 15 && styles.actionButtonTextCompact,
                          ]}
                        >
                          {stop.order === orderedStops[orderedStops.length - 1]?.order
                            ? 'Concluir'
                            : 'Visitado'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}

            {lastResult.destination && routePanelLevel !== 15 ? (
              <View style={styles.endpointRow}>
                <Ionicons name="flag" size={18} color={colors.textMuted} />
                <View style={styles.stopCopy}>
                  <Text style={styles.stopAddress}>{lastResult.destination.address}</Text>
                  <Text style={styles.stopCaption}>Destino final</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {isNavigationStarted && !activeStop && routePanelLevel === 50 ? (
            <Pressable style={styles.finishedButton} onPress={resetNavigation}>
              <Text style={styles.visitedButtonText}>Rota concluída · Finalizar</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      <OptionSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        title="Parada atual"
        options={settingsOptions}
      />
      <Modal
        visible={saveRouteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSaveRouteVisible(false)}
      >
        <Pressable style={styles.saveRouteBackdrop} onPress={() => setSaveRouteVisible(false)}>
          <Pressable style={styles.saveRouteCard} onPress={() => {}}>
            <Text style={styles.saveRouteTitle}>Salvar rota</Text>
            <Text style={styles.saveRouteDescription}>Dê um nome para encontrar essa rota depois.</Text>
            <TextInput
              autoFocus
              maxLength={100}
              style={styles.saveRouteInput}
              placeholder="Nome da rota"
              placeholderTextColor={colors.textMuted}
              value={saveRouteName}
              onChangeText={setSaveRouteName}
              returnKeyType="done"
              onSubmitEditing={() => void handleSaveRoute()}
            />
            <Pressable
              style={[styles.saveRouteButton, (!saveRouteName.trim() || isSavingRoute) && styles.saveRouteButtonDisabled]}
              disabled={!saveRouteName.trim() || isSavingRoute}
              onPress={() => void handleSaveRoute()}
            >
              {isSavingRoute ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.saveRouteButtonText}>Salvar</Text>
              )}
            </Pressable>
            <Pressable style={styles.saveRouteCancel} onPress={() => setSaveRouteVisible(false)}>
              <Text style={styles.saveRouteCancelText}>Cancelar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <OptionSheet
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        title="Ao excluir, você deseja..."
        options={deleteOptions}
      />
      <OptionSheet
        visible={navigationAppVisible}
        onClose={() => setNavigationAppVisible(false)}
        title="Escolha o aplicativo para navegar"
        options={navigationOptions}
      />
      <OptionSheet
        visible={routeActionsVisible}
        onClose={() => setRouteActionsVisible(false)}
        title="Opções da rota"
        options={routeActionOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { alignItems: 'center', justifyContent: 'center' },
  map: StyleSheet.absoluteFill,
  pinBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 5,
    borderRadius: 15,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.onAccent,
  },
  pinBadgeActive: { width: 40, height: 40, borderRadius: 20, borderWidth: 3 },
  pinBadgeFixed: { backgroundColor: colors.textMuted },
  pinBadgeVisited: { backgroundColor: '#46546b' },
  pinBadgeFailed: { backgroundColor: colors.dangerMuted },
  pinBadgeText: { color: colors.onAccent, fontWeight: '700', fontSize: 12 },
  searchBar: {
    position: 'absolute',
    left: 16,
    right: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: 15 },
  savedRoutesButton: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveRouteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  saveRouteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  saveRouteTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  saveRouteDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  saveRouteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  saveRouteButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  saveRouteButtonDisabled: { opacity: 0.5 },
  saveRouteButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  saveRouteCancel: { alignItems: 'center', padding: 10 },
  saveRouteCancelText: { color: colors.textMuted, fontWeight: '600' },
  routePanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  routePanelCompact: {
    backgroundColor: colors.background,
    borderTopWidth: 0,
    paddingTop: 4,
    paddingHorizontal: 20,
    shadowOpacity: 0,
    elevation: 0,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.55,
  },
  dragHandlePressable: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandlePressableCompact: { height: 20 },
  routeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routeHeaderText: { flex: 1, gap: 4 },
  headerAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  routeTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  routeSummary: { color: colors.textMuted, fontSize: 14 },
  polylineError: { color: colors.dangerMuted, fontSize: 12, marginBottom: 8 },
  startButton: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    minHeight: 48,
    marginBottom: 10,
  },
  startButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 16 },
  stopList: { flex: 1, flexShrink: 1 },
  stopListCompact: { flex: 0, flexShrink: 0, maxHeight: 84 },
  stopListDefault: { maxHeight: '78%' },
  stopListExpanded: { maxHeight: '92%' },
  stopListContent: { paddingBottom: 4 },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopRowCompact: {
    minHeight: 42,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderBottomWidth: 0,
  },
  stopRowActive: {
    backgroundColor: 'rgba(29, 78, 216, 0.18)',
    borderBottomColor: 'transparent',
  },
  activeStopGroup: {
    backgroundColor: 'rgba(29, 78, 216, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compactStopCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  stopRowPast: { opacity: 0.55 },
  stopRowFailed: { backgroundColor: 'rgba(180, 83, 97, 0.08)' },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  orderBadgeActive: { width: 34, height: 34, borderRadius: 17 },
  orderBadgeVisited: { backgroundColor: '#46546b' },
  orderBadgeFailed: { backgroundColor: colors.dangerMuted },
  orderText: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
  stopCopy: { flex: 1, gap: 3 },
  stopAddress: { color: colors.text, fontSize: 14, fontWeight: '600' },
  stopAddressCompact: { fontSize: 13 },
  stopAddressActive: { color: '#fff', fontSize: 15 },
  stopAddressPast: { color: colors.textMuted },
  stopAddressFailed: { color: colors.dangerMuted, textDecorationLine: 'line-through' },
  stopCaption: { color: colors.textMuted, fontSize: 12 },
  failedLabel: { color: colors.dangerMuted, fontSize: 11, fontWeight: '700' },
  visitedLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  legDistance: { color: colors.textMuted, fontSize: 12 },
  activeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 8,
    paddingTop: 0,
    paddingBottom: 12,
  },
  activeActionsCompact: {
    gap: 6,
    paddingHorizontal: 4,
    paddingBottom: 0,
  },
  settingsButton: {
    width: 48,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  settingsButtonCompact: { width: 36, height: 34 },
  navigateButton: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.accent,
    borderRadius: 10,
  },
  actionButtonCompact: { height: 34 },
  actionButtonTextCompact: { fontSize: 12 },
  navigateButtonText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
  visitedButton: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 10,
  },
  visitedButtonText: { color: colors.success, fontSize: 14, fontWeight: '700' },
  finishedButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: 10,
    marginTop: 10,
  },
});
