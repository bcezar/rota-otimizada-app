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
import { colors } from '../src/theme/colors';

export default function AddSavedAddress() {
  const { addAddress } = useAddressBook();
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
      const id = addAddress(address);
      router.replace({ pathname: '/address-detail', params: { id } });
    } catch {
      setError('Não foi possível localizar esse endereço. Tente ser mais específico.');
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Adicionar endereço</Text>
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
        onSubmitEditing={() => query.trim() && confirmAddress(query.trim())}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isConfirming ? <ActivityIndicator style={styles.loading} /> : null}

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
});
