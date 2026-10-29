import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAddressBook } from '../src/addressBook/AddressBookContext';
import { SettingsRow } from '../src/components/SettingsRow';
import { colors } from '../src/theme/colors';

export default function AddressDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addresses, updateAddress, removeAddress } = useAddressBook();
  const current = addresses.find((item) => item.id === id);
  const [newTag, setNewTag] = useState('');

  if (!id || !current) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Endereço não encontrado.</Text>
      </View>
    );
  }

  function handleAddTag() {
    const trimmed = newTag.trim();
    if (!trimmed || !current || current.tags.includes(trimmed)) {
      setNewTag('');
      return;
    }
    updateAddress(current.id, { tags: [...current.tags, trimmed] });
    setNewTag('');
  }

  function handleRemoveTag(tag: string) {
    if (!current) return;
    updateAddress(current.id, { tags: current.tags.filter((t) => t !== tag) });
  }

  function handleRemoveAddress() {
    Alert.alert(
      'Remover endereço?',
      'Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            removeAddress(current!.id);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Detalhe do endereço</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>

      {/* Seção 1 — Local */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endereço</Text>
        <Text style={styles.sectionSubtitle}>{current.address}</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome do Local"
          placeholderTextColor={colors.textMuted}
          value={current.placeName}
          onChangeText={(text) => updateAddress(current.id, { placeName: text })}
        />
      </View>

      {/* Seção 2 — Notas */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Adicione uma anotação..."
          placeholderTextColor={colors.textMuted}
          multiline
          value={current.notes}
          onChangeText={(text) => updateAddress(current.id, { notes: text })}
        />
      </View>

      {/* Seção 3 — Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cliente</Text>
        <SettingsRow
          label={current.client?.name || 'Nenhum cliente'}
          value={current.client?.phone || current.client?.email || undefined}
          onPress={() => router.push({ pathname: '/edit-client', params: { id: current.id } })}
        />
      </View>

      {/* Seção 4 — Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags</Text>
        {current.tags.length > 0 ? (
          <View style={styles.tagsRow}>
            {current.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <Pressable onPress={() => handleRemoveTag(tag)}>
                  <Text style={styles.tagChipRemove}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View style={styles.addTagRow}>
          <TextInput
            style={[styles.input, styles.addTagInput]}
            placeholder="Nova tag"
            placeholderTextColor={colors.textMuted}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={handleAddTag}
          />
          <Pressable style={styles.addTagButton} onPress={handleAddTag}>
            <Text style={styles.addTagButtonText}>Adicionar</Text>
          </Pressable>
        </View>
      </View>

      <Pressable style={styles.saveButton} onPress={() => router.back()}>
        <Text style={styles.saveButtonText}>Salvar</Text>
      </Pressable>

      <Pressable style={styles.deleteButton} onPress={handleRemoveAddress}>
        <Text style={styles.deleteButtonText}>Remover endereço</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },
  closeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  tagChipRemove: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  addTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addTagInput: {
    flex: 1,
  },
  addTagButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  addTagButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 13,
  },
  deleteButton: {
    alignItems: 'center',
    padding: 4,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
});
