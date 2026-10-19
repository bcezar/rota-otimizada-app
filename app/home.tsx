import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ApiError } from '../src/api/client';
import * as routesApi from '../src/api/routes';
import type { StopLimitExceededDetail } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { AddressAutocompleteInput } from '../src/components/AddressAutocompleteInput';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function Home() {
  const { user, token, logout } = useAuth();
  const {
    stops,
    removeStop,
    updateStopDescription,
    clearAll,
    origin,
    setOrigin,
    destination,
    setDestination,
    fixedFirst,
    toggleFixedFirst,
    fixedLast,
    toggleFixedLast,
    locationHint,
    setLocationHint,
    setLastResult,
  } = useStops();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  function handleSelectFixedPoint(address: string) {
    routesApi
      .geocode(address, locationHint)
      .then((geocoded) => setLocationHint({ lat: geocoded.lat, lng: geocoded.lng }))
      .catch(() => {
        // falha silenciosa — a dica de localização é só um bias de UX, a
        // validação real do endereço acontece no /routes/optimize
      });
  }

  function handleClearAll() {
    Alert.alert(
      'Limpar tudo?',
      'Isso vai remover todas as paradas adicionadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => clearAll() },
      ],
    );
  }

  async function handleOptimize() {
    setError('');
    setIsOptimizing(true);
    try {
      const result = await routesApi.optimizeRoute(
        stops.map((stop) => stop.address),
        token,
        origin.trim() || undefined,
        destination.trim() || undefined,
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
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {user?.email}</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      {stops.length > 0 ? (
        <Pressable style={styles.clearAllButton} onPress={handleClearAll}>
          <Text style={styles.clearAllText}>Limpar tudo</Text>
        </Pressable>
      ) : null}

      <View style={styles.fixedPointsRow}>
        <AddressAutocompleteInput
          placeholder="Origem (opcional)"
          value={origin}
          onChangeText={setOrigin}
          locationHint={locationHint}
          onSelectSuggestion={handleSelectFixedPoint}
        />
        <AddressAutocompleteInput
          placeholder="Destino (opcional)"
          value={destination}
          onChangeText={setDestination}
          locationHint={locationHint}
          onSelectSuggestion={handleSelectFixedPoint}
        />
      </View>

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

      <View style={styles.addButtonsRow}>
        <Pressable style={[styles.addButton, styles.addButtonHalf]} onPress={() => router.push('/add-stop')}>
          <Text style={styles.addButtonText}>+ Adicionar parada</Text>
        </Pressable>
        <Pressable
          style={[styles.addButton, styles.addButtonHalf]}
          onPress={() => router.push('/pick-location')}
        >
          <Text style={styles.addButtonText}>📍 Selecionar no mapa</Text>
        </Pressable>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  logoutText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  clearAllButton: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  clearAllText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  fixedPointsRow: {
    gap: 8,
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
  addButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  addButtonHalf: {
    flex: 1,
  },
  addButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
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
