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

import * as routesApi from '../src/api/routes';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { useStops } from '../src/stops/StopsContext';

export default function AddStop() {
  const { addStop } = useStops();
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

  async function confirmAddress(address: string) {
    setError('');
    setIsConfirming(true);
    try {
      await routesApi.geocode(address);
      addStop(address);
      router.back();
    } catch {
      setError('Não foi possível localizar esse endereço. Tente ser mais específico.');
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar parada</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite um endereço"
        autoFocus
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => query.trim() && confirmAddress(query.trim())}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isConfirming ? <ActivityIndicator style={styles.loading} /> : null}
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => `${item}-${index}`}
        renderItem={({ item }) => (
          <Pressable style={styles.suggestion} onPress={() => confirmAddress(item)}>
            <Text>{item}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
  },
  loading: {
    marginTop: 4,
  },
  suggestion: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 14,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
});
