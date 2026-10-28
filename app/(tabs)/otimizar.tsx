import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '../../src/api/client';
import * as routesApi from '../../src/api/routes';
import type { StopLimitExceededDetail } from '../../src/api/types';
import { useAuth } from '../../src/auth/AuthContext';
import { OptionSheet } from '../../src/components/OptionSheet';
import { SettingsRow } from '../../src/components/SettingsRow';
import { usePreferences } from '../../src/preferences/PreferencesContext';
import { useStops } from '../../src/stops/StopsContext';
import { colors } from '../../src/theme/colors';

export default function Otimizar() {
  const { token } = useAuth();
  const {
    stops,
    origin,
    setOrigin,
    destination,
    setDestination,
    destinationMode,
    setDestinationMode,
    fixedFirst,
    fixedLast,
    setLastResult,
    resetNavigation,
  } = useStops();
  const preferences = usePreferences();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');
  const [destinationSheetVisible, setDestinationSheetVisible] = useState(false);

  // Pré-preenche a partir das Preferências salvas em Conta, só na primeira
  // vez (StopsContext ainda zerado) — depois disso o usuário edita aqui
  // livremente sem ser sobrescrito.
  useEffect(() => {
    if (!origin && preferences.defaultOrigin) {
      setOrigin(preferences.defaultOrigin);
    }
    if (destinationMode === 'none' && preferences.destinationMode !== 'none') {
      if (preferences.destinationMode === 'custom' && preferences.defaultDestination) {
        setDestination(preferences.defaultDestination);
      }
      setDestinationMode(preferences.destinationMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const destinationLabel =
    destinationMode === 'return_to_origin'
      ? 'Retornar ao início'
      : destinationMode === 'custom'
        ? destination
        : 'Não especificado';

  async function handleOptimize() {
    setError('');
    setIsOptimizing(true);
    try {
      const resolvedDestination =
        destinationMode === 'return_to_origin'
          ? origin
          : destinationMode === 'custom'
            ? destination
            : undefined;
      const result = await routesApi.optimizeRoute(
        stops.map((stop) => stop.address),
        token,
        origin.trim() || undefined,
        resolvedDestination?.trim() || undefined,
        fixedFirst,
        fixedLast,
        stops.map((stop) => stop.id),
      );
      resetNavigation();
      setLastResult(result);
      router.navigate('/navegacao');
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        const detail = e.detail as StopLimitExceededDetail;
        setError(`Limite de ${detail.limit} paradas atingido para o seu plano.`);
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível otimizar a rota.');
      }
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Otimizar rota</Text>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SettingsRow
          icon="navigate-outline"
          label="Ponto de Partida"
          value={origin || 'Nenhum selecionado'}
          onPress={() =>
            router.push({
              pathname: '/pick-default-address',
              params: { target: 'origin', scope: 'stops' },
            })
          }
        />
        <SettingsRow
          icon="flag-outline"
          label="Destino Final"
          value={destinationLabel}
          onPress={() => setDestinationSheetVisible(true)}
        />
        <SettingsRow
          icon="add-circle-outline"
          label="Adicionar parada"
          onPress={() => router.push('/add-stop')}
        />

        <View style={styles.stopsHeader}>
          <Text style={styles.stopsHeaderText}>Paradas adicionadas</Text>
          <View style={styles.stopsCountBadge}>
            <Text style={styles.stopsCountText}>{stops.length}</Text>
          </View>
        </View>

        {stops.length === 0 ? (
          <Text style={styles.emptyText}>Adicione ao menos 2 paradas para otimizar.</Text>
        ) : (
          stops.map((item) => (
            <Pressable
              key={item.id}
              style={styles.stopCard}
              onPress={() => router.push({ pathname: '/stop-detail', params: { id: item.id } })}
            >
              <Ionicons name="location" size={20} color={colors.accent} />
              <View style={styles.stopMain}>
                <Text style={styles.stopAddress}>{item.placeName || item.address}</Text>
                {item.placeName ? (
                  <Text style={styles.stopSubtitle}>{item.address}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.optimizeButton, stops.length < 2 && styles.buttonDisabled]}
        disabled={stops.length < 2 || isOptimizing}
        onPress={handleOptimize}
      >
        {isOptimizing ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.optimizeButtonText}>Otimizar rota</Text>
        )}
      </Pressable>

      <OptionSheet
        visible={destinationSheetVisible}
        onClose={() => setDestinationSheetVisible(false)}
        title="Destino Final"
        options={[
          { label: 'Retornar ao início', onPress: () => setDestinationMode('return_to_origin') },
          {
            label: 'Escolher endereço',
            onPress: () =>
              router.push({
                pathname: '/pick-default-address',
                params: { target: 'destination', scope: 'stops' },
              }),
          },
          { label: 'Não especificado', onPress: () => setDestinationMode('none') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  stopsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  stopsHeaderText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  stopsCountBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  stopsCountText: {
    color: colors.onAccent,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 24,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  stopMain: {
    flex: 1,
    gap: 2,
  },
  stopAddress: {
    color: colors.text,
    fontWeight: '600',
  },
  stopSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    marginTop: 8,
  },
  optimizeButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  optimizeButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
});
