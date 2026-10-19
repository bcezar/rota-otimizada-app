import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAddressBook } from '../src/addressBook/AddressBookContext';
import * as routesApi from '../src/api/routes';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function AddStop() {
  const { addStop, locationHint, setLocationHint } = useStops();
  const { addresses: savedAddresses } = useAddressBook();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
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
      .autocomplete(trimmed, locationHint)
      .then((res) => {
        if (!cancelled) setSuggestions(res.suggestions);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
    // locationHint intencionalmente fora das deps: só queremos re-buscar
    // quando o texto muda, não quando a dica de localização é definida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  async function confirmAddress(address: string) {
    setError('');
    setIsConfirming(true);
    try {
      const geocoded = await routesApi.geocode(address, locationHint);
      addStop(address);
      setLocationHint({ lat: geocoded.lat, lng: geocoded.lng });
      router.back();
    } catch {
      setError('Não foi possível localizar esse endereço. Tente ser mais específico.');
    } finally {
      setIsConfirming(false);
    }
  }

  function handleSavedAddressPress() {
    if (savedAddresses.length === 0) {
      setError('Nenhum endereço salvo ainda.');
      return;
    }
    router.push('/pick-saved-address');
  }

  const showSuggestions = query.trim().length >= 3;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar parada</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite um endereço"
        placeholderTextColor={colors.textMuted}
        autoFocus
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => query.trim() && confirmAddress(query.trim())}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isConfirming ? <ActivityIndicator style={styles.loading} /> : null}

      {showSuggestions ? (
        <View>
          {suggestions.map((item, index) => (
            <Pressable
              key={`${item}-${index}`}
              style={styles.suggestion}
              onPress={() => confirmAddress(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.optionsGrid}>
          <Pressable
            style={styles.optionButton}
            onPress={() => router.push('/pick-location')}
          >
            <Ionicons name="map-outline" size={22} color={colors.accent} />
            <Text style={styles.optionButtonText}>Mapa</Text>
          </Pressable>
          <Pressable
            style={styles.optionButton}
            onPress={() => router.push('/add-stops-batch')}
          >
            <Ionicons name="list-outline" size={22} color={colors.accent} />
            <Text style={styles.optionButtonText}>Lote</Text>
          </Pressable>
          <Pressable style={styles.optionButton} onPress={handleSavedAddressPress}>
            <Ionicons name="bookmark-outline" size={22} color={colors.accent} />
            <Text style={styles.optionButtonText}>Lista de endereços</Text>
          </Pressable>
          <Pressable
            style={styles.optionButton}
            onPress={() => router.push('/(tabs)/importar')}
          >
            <Ionicons name="cloud-upload-outline" size={22} color={colors.accent} />
            <Text style={styles.optionButtonText}>Importar</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
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
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
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
  loading: {
    marginTop: 4,
  },
  suggestion: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    width: '47%',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
    marginTop: 'auto',
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
