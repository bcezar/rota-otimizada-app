import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as routesApi from '../src/api/routes';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { usePreferences } from '../src/preferences/PreferencesContext';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function PickDefaultAddress() {
  const { target, scope } = useLocalSearchParams<{
    target: 'origin' | 'destination';
    scope?: 'preferences' | 'stops';
  }>();
  const effectiveScope = scope ?? 'preferences';
  const preferences = usePreferences();
  const stopsContext = useStops();
  const setOriginValue =
    effectiveScope === 'stops' ? stopsContext.setOrigin : preferences.setDefaultOrigin;
  const setDestinationValue =
    effectiveScope === 'stops' ? stopsContext.setDestination : preferences.setDefaultDestination;
  const setDestinationMode =
    effectiveScope === 'stops' ? stopsContext.setDestinationMode : preferences.setDestinationMode;
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    routesApi
      .autocomplete(trimmed)
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function commit(address: string) {
    if (target === 'origin') {
      setOriginValue(address);
    } else {
      setDestinationValue(address);
      setDestinationMode('custom');
    }
    router.back();
  }

  function handleClear() {
    if (target === 'origin') {
      setOriginValue('');
    } else {
      setDestinationMode('none');
    }
    router.back();
  }

  async function handleUseCurrentLocation() {
    setError('');
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permissão de localização negada.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const res = await routesApi.reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );
      commit(res.address);
    } catch {
      setError('Não foi possível obter sua localização atual.');
    } finally {
      setIsLocating(false);
    }
  }

  const showSpecialRows = query.trim().length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {target === 'origin' ? 'Endereço de início padrão' : 'Endereço de fim padrão'}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Digite um endereço"
        placeholderTextColor={colors.textMuted}
        autoFocus
        value={query}
        onChangeText={setQuery}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showSpecialRows ? (
        <View>
          <Pressable style={styles.specialRow} onPress={handleUseCurrentLocation}>
            {isLocating ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <View style={styles.specialRowContent}>
                <Ionicons name="locate" size={20} color={colors.accent} />
                <View>
                  <Text style={styles.specialRowTitle}>Localização Atual</Text>
                  <Text style={styles.specialRowSubtitle}>Selecione sua localização atual</Text>
                </View>
              </View>
            )}
          </Pressable>
          <Pressable style={styles.specialRow} onPress={handleClear}>
            <View style={styles.specialRowContent}>
              <Ionicons name="close-circle-outline" size={20} color={colors.dangerMuted} />
              <Text style={styles.clearText}>Limpar endereço padrão</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <View>
          {suggestions.map((item, index) => (
            <Pressable
              key={`${item}-${index}`}
              style={styles.suggestion}
              onPress={() => commit(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  closeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
  },
  specialRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specialRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specialRowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  specialRowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  clearText: {
    color: colors.dangerMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  suggestion: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
  },
});
