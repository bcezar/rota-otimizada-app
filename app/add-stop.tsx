import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAddressBook } from '../src/addressBook/AddressBookContext';
import * as routesApi from '../src/api/routes';
import { SafeAreaScreen } from '../src/components/SafeAreaScreen';
import { useDebouncedValue } from '../src/hooks/useDebouncedValue';
import { usePreferences } from '../src/preferences/PreferencesContext';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function AddStop() {
  const {
    addStop,
    stops,
    isHydrated,
    origin,
    destination,
    locationHint,
    setLocationHint,
    setInitialLocationHint,
  } = useStops();
  const { defaultOrigin, defaultDestination } = usePreferences();
  const { addresses: savedAddresses } = useAddressBook();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const debouncedQuery = useDebouncedValue(query, 400);
  const initialReferenceAddress =
    stops[stops.length - 1]?.address.trim() ||
    origin.trim() ||
    defaultOrigin.trim() ||
    destination.trim() ||
    defaultDestination.trim();

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
    setError('');
  });
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript.trim();
    if (event.isFinal && transcript) setQuery(transcript);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error === 'not-allowed') {
      setError('Permita o acesso ao microfone e ao reconhecimento de voz para ditar.');
    } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
      setError('Não foi possível reconhecer a fala. Tente novamente.');
    }
  });

  useEffect(() => {
    if (!isHydrated || locationHint || !initialReferenceAddress) return;
    let cancelled = false;
    routesApi
      .geocode(initialReferenceAddress)
      .then((coordinates) => {
        if (!cancelled) {
          setInitialLocationHint({ lat: coordinates.lat, lng: coordinates.lng });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // The initial hint setter only fills an empty hint; later selections replace it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialReferenceAddress, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
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
  }, [debouncedQuery, isHydrated, locationHint]);

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

  async function handleVoiceInput() {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    setError('');
    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Permita o acesso ao microfone e ao reconhecimento de voz para ditar.');
        return;
      }
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        setError('O reconhecimento de voz não está disponível neste aparelho.');
        return;
      }

      Keyboard.dismiss();
      ExpoSpeechRecognitionModule.start({
        lang: 'pt-BR',
        interimResults: true,
        continuous: false,
      });
    } catch {
      setIsListening(false);
      setError('Não foi possível iniciar o ditado. Tente novamente.');
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
    <SafeAreaScreen style={styles.container}>
      <Text style={styles.title}>Adicionar parada</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Digite um endereço"
          placeholderTextColor={colors.textMuted}
          autoFocus
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => query.trim() && confirmAddress(query.trim())}
        />
        {Platform.OS !== 'web' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Parar ditado' : 'Ditar endereço'}
            accessibilityState={{ selected: isListening }}
            style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            onPress={() => void handleVoiceInput()}
          >
            <Ionicons
              name={isListening ? 'stop' : 'mic-outline'}
              size={22}
              color={isListening ? colors.onAccent : colors.accent}
            />
          </Pressable>
        ) : null}
      </View>
      {isListening ? (
        <Text accessibilityLiveRegion="polite" style={styles.voiceStatus}>
          Ouvindo… toque no botão para encerrar.
        </Text>
      ) : null}
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
        <Text style={styles.cancelButtonText}>Voltar</Text>
      </Pressable>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voiceButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  voiceButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  voiceStatus: {
    color: colors.accent,
    fontSize: 13,
    textAlign: 'center',
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
