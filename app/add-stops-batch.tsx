import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SafeAreaScreen } from '../src/components/SafeAreaScreen';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function AddStopsBatch() {
  const { addStops } = useStops();
  const [text, setText] = useState('');

  function handleAdd() {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    addStops(
      lines.map((address) => ({ address, description: '' })),
      'add',
    );
    router.dismissTo('/otimizar');
  }

  return (
    <SafeAreaScreen style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Adicionar em lote</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={8}
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color={colors.textMuted} />
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>

      <Text style={styles.instructions}>Cole ou digite um endereço por linha.</Text>

      <TextInput
        style={styles.textarea}
        placeholder={'Rua das Flores, 123\nAv. Paulista, 1000\n...'}
        placeholderTextColor={colors.textMuted}
        multiline
        autoFocus
        value={text}
        onChangeText={setText}
      />

      <Pressable
        style={[styles.addButton, !text.trim() && styles.buttonDisabled]}
        disabled={!text.trim()}
        onPress={handleAdd}
      >
        <Text style={styles.addButtonText}>Adicionar paradas</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    minHeight: 44,
    minWidth: 76,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  closeText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  instructions: {
    color: colors.textMuted,
    fontSize: 13,
  },
  textarea: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
});
