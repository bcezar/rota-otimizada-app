import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
    removeStop,
    updateStopDescription,
    origin,
    setOrigin,
    destination,
    setDestination,
    destinationMode,
    setDestinationMode,
    fixedFirst,
    toggleFixedFirst,
    fixedLast,
    toggleFixedLast,
    setLastResult,
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
      );
      setLastResult(result);
      router.push('/result');
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

      <FlatList
        style={styles.list}
        data={stops}
        keyExtractor={(stop) => stop.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Adicione ao menos 2 paradas para otimizar.</Text>
        }
        renderItem={({ item }) => {
          const isFirst = fixedFirst === item.address;
          const isLast = fixedLast === item.address;
          return (
            <View style={styles.stopRow}>
              <View style={styles.stopMain}>
                <Text style={styles.stopAddress}>{item.address}</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Anotação (opcional)"
                  placeholderTextColor={colors.textMuted}
                  value={item.description}
                  onChangeText={(text) => updateStopDescription(item.id, text)}
                />
              </View>
              <Pressable onPress={() => toggleFixedFirst(item.address)}>
                <Text style={[styles.stopActionText, isFirst && styles.stopActionActiveFirst]}>
                  1º
                </Text>
              </Pressable>
              <Pressable onPress={() => toggleFixedLast(item.address)}>
                <Text style={[styles.stopActionText, isLast && styles.stopActionActiveLast]}>
                  Últ.
                </Text>
              </Pressable>
              <Pressable onPress={() => removeStop(item.id)}>
                <Text style={styles.removeText}>Remover</Text>
              </Pressable>
            </View>
          );
        }}
      />

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
  list: {
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopMain: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  stopAddress: {
    flex: 1,
    color: colors.text,
  },
  descriptionInput: {
    fontSize: 12,
    color: colors.textMuted,
    padding: 0,
  },
  stopActionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stopActionActiveFirst: {
    color: colors.accent,
  },
  stopActionActiveLast: {
    color: '#a78bfa',
  },
  removeText: {
    color: colors.danger,
  },
  error: {
    color: colors.danger,
  },
  optimizeButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
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
