import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../src/api/client';
import * as routesApi from '../src/api/routes';
import type { RouteStop } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { mapRouteStopsToLocalStops } from '../src/stops/routeStopMapping';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

interface ReorderableStop {
  id: string;
  routeStop: RouteStop;
}

export default function ReorderRoute() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const {
    stops,
    lastResult,
    setLastResult,
    resetNavigation,
  } = useStops();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const sourceIdsByOrder = useMemo(
    () => mapRouteStopsToLocalStops(lastResult?.optimized_route ?? [], stops),
    [lastResult, stops],
  );
  const initialItems = useMemo<ReorderableStop[]>(
    () =>
      (lastResult?.optimized_route ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((routeStop) => ({
          id:
            routeStop.stop_id ??
            sourceIdsByOrder[routeStop.order] ??
            `${routeStop.original_address}:${routeStop.order}`,
          routeStop,
        })),
    [lastResult, sourceIdsByOrder],
  );
  const [items, setItems] = useState<ReorderableStop[]>(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  async function saveOrder() {
    if (!lastResult || items.length < 2) return;
    setError('');
    setIsSaving(true);
    try {
      const result = await routesApi.optimizeRoute(
        items.map(({ routeStop }) => routeStop.original_address),
        token,
        lastResult.origin?.address,
        lastResult.destination?.address,
        null,
        null,
        items.map(({ id }) => id),
        true,
      );
      setLastResult(result);
      resetNavigation();
      router.back();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível salvar a nova ordem.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!lastResult) {
    return (
      <View style={[styles.container, styles.emptyContainer]}>
        <Text style={styles.errorText}>Não há uma rota ativa para ajustar.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Ajustar ordem</Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.description}>
        Toque no ícone de arraste e mova a parada para a posição desejada.
      </Text>

      <View style={styles.listContainer}>
        <DraggableFlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item.id}
          activationDistance={8}
          autoscrollThreshold={72}
          autoscrollSpeed={48}
          onDragEnd={({ data }) => setItems(data)}
          ListEmptyComponent={
            <View style={styles.emptyListCard}>
              <Ionicons name="alert-circle-outline" size={22} color={colors.textMuted} />
              <Text style={styles.emptyListText}>
                Esta rota não tem paradas disponíveis para reordenar.
              </Text>
            </View>
          }
          ListHeaderComponent={
            lastResult.origin ? (
              <View style={styles.endpointCard}>
                <Ionicons name="home" size={18} color={colors.textMuted} />
                <View style={styles.stopInfo}>
                  <Text style={styles.endpointLabel}>Início fixo</Text>
                  <Text style={styles.stopAddress} numberOfLines={2}>{lastResult.origin.address}</Text>
                </View>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              </View>
            ) : null
          }
          ListFooterComponent={
            lastResult.destination ? (
              <View style={styles.endpointCard}>
                <Ionicons name="flag" size={18} color={colors.textMuted} />
                <View style={styles.stopInfo}>
                  <Text style={styles.endpointLabel}>Destino fixo</Text>
                  <Text style={styles.stopAddress} numberOfLines={2}>{lastResult.destination.address}</Text>
                </View>
                <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
              </View>
            ) : null
          }
          renderItem={({ item, getIndex, drag, isActive }) => {
            const index = getIndex() ?? 0;
            const localStop = stops.find((stop) => stop.id === item.id);
            return (
              <View style={[styles.stopCard, isActive && styles.stopCardDragging]}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  {localStop?.placeName ? (
                    <Text style={styles.stopLabel} numberOfLines={1}>{localStop.placeName}</Text>
                  ) : null}
                  <Text style={styles.stopAddress} numberOfLines={2}>
                    {item.routeStop.original_address}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Arraste a parada ${index + 1}`}
                  onPressIn={drag}
                  disabled={isActive}
                  style={styles.dragHandle}
                >
                  <Ionicons name="reorder-three-outline" size={28} color={colors.textMuted} />
                </Pressable>
              </View>
            );
          }}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()} disabled={isSaving}>
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, isSaving && styles.buttonDisabled]}
          onPress={saveOrder}
          disabled={isSaving || items.length < 2}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.saveButtonText}>Aplicar nova ordem</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 18 },
  emptyContainer: { justifyContent: 'center', gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 10 },
  headerSpacer: { width: 24 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  description: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  listContainer: { flex: 1, flexBasis: 0, minHeight: 240 },
  list: { flex: 1, minHeight: 240 },
  listContent: { paddingBottom: 16 },
  emptyListCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
  },
  emptyListText: { flex: 1, color: colors.textMuted, fontSize: 14 },
  endpointCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  endpointLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  stopCard: {
    height: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 8,
  },
  stopCardDragging: { borderColor: colors.accent, opacity: 0.8 },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  orderBadgeText: { color: colors.onAccent, fontSize: 12, fontWeight: '700' },
  stopInfo: { flex: 1, gap: 3 },
  stopLabel: { color: colors.text, fontSize: 14, fontWeight: '700' },
  stopAddress: { color: colors.textMuted, fontSize: 12 },
  dragHandle: { width: 34, height: 54, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    minWidth: 90,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  saveButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  saveButtonText: { color: colors.onAccent, fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  errorText: { color: colors.danger, fontSize: 13 },
});
