import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import * as routesApi from '../src/api/routes';
import { ApiError } from '../src/api/client';
import * as savedRoutesApi from '../src/api/savedRoutes';
import type { SavedRoute, SavedRouteInputs } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { useStops, type DestinationMode, type Stop } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

function routeStops(route: SavedRoute): Stop[] {
  const inputs = route.inputs as SavedRouteInputs & { addresses?: unknown[] };
  const details = inputs.stop_details ?? [];
  const addresses = (Array.isArray(inputs.addresses) ? inputs.addresses : [])
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && 'address' in entry) {
        const address = (entry as { address?: unknown }).address;
        return typeof address === 'string' ? address : '';
      }
      return '';
    })
    .filter(Boolean);
  const legacyResultStops = (route.result?.optimized_route ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);
  const sourceAddresses = addresses.length
    ? addresses
    : legacyResultStops.map((stop) => stop.original_address).filter(Boolean);

  return sourceAddresses.map((address, index) => {
    const detail = details[index];
    return {
      id: detail?.id ?? inputs.stop_ids?.[index] ?? `saved-${route.code}-${index + 1}`,
      address: detail?.address ?? address,
      description: detail?.description ?? '',
      placeName: detail?.place_name ?? '',
      client: detail?.client ?? null,
      tags: detail?.tags ?? [],
    };
  });
}

function destinationModeFor(inputs: SavedRouteInputs): DestinationMode {
  if (inputs.destination_mode) return inputs.destination_mode;
  if (!inputs.destination) return 'none';
  return inputs.origin === inputs.destination ? 'return_to_origin' : 'custom';
}

export default function SavedRoutes() {
  const { token } = useAuth();
  const { loadSavedRoute } = useStops();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    if (!token) {
      setRoutes([]);
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    setIsLoading(true);
    setError('');
    savedRoutesApi.listSavedRoutes(token)
      .then((items) => {
        if (!cancelled) setRoutes(items);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : 'Não foi possível carregar suas rotas salvas.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]));

  async function handleUseRoute(route: SavedRoute) {
    if (!token) return;
    const stops = routeStops(route);
    if (stops.length < 2) {
      Alert.alert('Rota incompleta', 'Esta rota não tem pelo menos duas paradas para otimizar.');
      return;
    }
    setLoadingCode(route.code);
    try {
      const result = await routesApi.optimizeRoute(
        stops.map((stop) => stop.address),
        token,
        route.inputs.origin || undefined,
        route.inputs.destination || undefined,
        route.inputs.fixed_first || undefined,
        route.inputs.fixed_last || undefined,
        stops.map((stop) => stop.id),
        route.inputs.preserve_order ?? false,
      );
      loadSavedRoute({
        stops,
        origin: route.inputs.origin ?? '',
        destination: route.inputs.destination ?? '',
        destinationMode: destinationModeFor(route.inputs),
        fixedFirst: route.inputs.fixed_first ?? null,
        fixedLast: route.inputs.fixed_last ?? null,
        result,
      });
      router.replace('/navegacao');
    } catch (cause) {
      const apiError = cause instanceof ApiError ? cause : null;
      const detail = apiError?.detail;
      console.error('[saved-routes] Falha ao usar rota salva', {
        routeCode: route.code,
        stopCount: stops.length,
        endpoint: '/api/v1/routes/optimize',
        status: apiError?.status ?? null,
        message: apiError?.message ?? (cause instanceof Error ? cause.message : 'Erro desconhecido'),
        detail: apiError?.detail ?? null,
      });

      if (
        apiError?.status === 403 &&
        typeof detail === 'object' &&
        detail !== null &&
        'code' in detail &&
        detail.code === 'STOP_LIMIT_EXCEEDED'
      ) {
        const limit = 'limit' in detail && typeof detail.limit === 'number' ? detail.limit : null;
        Alert.alert(
          'Limite de paradas excedido',
          limit
            ? `Esta rota tem ${stops.length} paradas, mas seu plano permite até ${limit}. Edite a rota ou altere seu plano para usá-la.`
            : 'Esta rota tem mais paradas do que o permitido pelo seu plano.',
        );
        return;
      }

      Alert.alert(
        'Não foi possível usar a rota',
        apiError ? `${apiError.message} (HTTP ${apiError.status})` : 'Verifique sua conexão e tente novamente.',
      );
    } finally {
      setLoadingCode(null);
    }
  }

  function confirmDelete(route: SavedRoute) {
    Alert.alert('Excluir rota salva?', `“${route.name}” será removida da sua conta.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          if (!token) return;
          savedRoutesApi.deleteSavedRoute(route.code, token)
            .then(() => setRoutes((current) => current.filter((item) => item.code !== route.code)))
            .catch((cause) => Alert.alert('Não foi possível excluir', cause instanceof Error ? cause.message : 'Tente novamente.'));
        },
      },
    ]);
  }

  function renderRoute({ item }: { item: SavedRoute }) {
    const stopCount = item.result?.optimized_route?.length ?? routeStops(item).length;
    const distance = item.result?.total_distance_km;
    const date = item.created_at
      ? new Date(item.created_at.replace(' ', 'T') + (item.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString('pt-BR')
      : 'Salva recentemente';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardText}>
            <Text style={styles.routeName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.routeSummary}>
              {stopCount} {stopCount === 1 ? 'parada' : 'paradas'}
              {distance != null ? ` · ${distance.toFixed(1)} km` : ''}
              {' · '}{date}
            </Text>
          </View>
          <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)} accessibilityLabel={`Excluir ${item.name}`}>
            <Ionicons name="trash-outline" size={19} color={colors.danger} />
          </Pressable>
        </View>
        <Pressable
          style={styles.useButton}
          disabled={loadingCode !== null}
          onPress={() => void handleUseRoute(item)}
        >
          {loadingCode === item.code ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.useButtonText}>Usar rota</Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Rotas salvas</Text>
        <View style={styles.headerSpacer} />
      </View>

      {!token ? (
        <View style={styles.messageContainer}>
          <Ionicons name="bookmark-outline" size={34} color={colors.accent} />
          <Text style={styles.messageTitle}>Entre para acessar suas rotas</Text>
          <Text style={styles.messageText}>As rotas salvas ficam disponíveis na sua conta em outros dispositivos.</Text>
          <Pressable style={styles.useButton} onPress={() => router.push('/login')}>
            <Text style={styles.useButtonText}>Entrar ou criar conta</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.messageContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={routes}
          keyExtractor={(item) => item.code}
          renderItem={renderRoute}
          contentContainerStyle={routes.length ? styles.list : styles.emptyList}
          ListEmptyComponent={
            <View style={styles.messageContainer}>
              <Ionicons name="map-outline" size={34} color={colors.textMuted} />
              <Text style={styles.messageTitle}>Nenhuma rota salva</Text>
              <Text style={styles.messageText}>Otimize uma rota e salve-a pelo menu da Navegação.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  title: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '700', marginLeft: 8 },
  headerSpacer: { width: 36 },
  list: { paddingHorizontal: 20, paddingBottom: 28, gap: 12 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { flex: 1, gap: 5 },
  routeName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  routeSummary: { color: colors.textMuted, fontSize: 12 },
  deleteButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  useButton: { backgroundColor: colors.accent, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  useButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 15 },
  messageContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  messageTitle: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  messageText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  error: { color: colors.danger, padding: 20, textAlign: 'center' },
});
