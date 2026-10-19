import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import * as routesApi from '../api/routes';
import type { Coordinates } from '../api/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { colors } from '../theme/colors';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  locationHint?: Coordinates | null;
  onSelectSuggestion?: (address: string) => void;
}

export function AddressAutocompleteInput({
  value,
  onChangeText,
  placeholder,
  locationHint,
  onSelectSuggestion,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  // Busca só acontece enquanto o campo está focado — evita reabrir a lista
  // quando a tela remonta com um valor já preenchido (ex: "Voltar" do
  // resultado usa router.replace, que remonta home.tsx do zero) ou quando o
  // próprio handleSelect muda o texto para o valor escolhido.
  const [isFocused, setIsFocused] = useState(false);
  const debouncedValue = useDebouncedValue(value, 400);

  useEffect(() => {
    if (!isFocused) {
      setSuggestions([]);
      return;
    }
    const trimmed = debouncedValue.trim();
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
  }, [debouncedValue, isFocused]);

  function handleSelect(suggestion: string) {
    onChangeText(suggestion);
    setSuggestions([]);
    onSelectSuggestion?.(suggestion);
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {suggestions.length > 0 ? (
        <ScrollView
          style={styles.suggestions}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {suggestions.map((item, index) => (
            <Pressable
              key={`${item}-${index}`}
              style={styles.suggestion}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.suggestionText}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
  },
  suggestions: {
    maxHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colors.surface,
  },
  suggestion: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
  },
});
