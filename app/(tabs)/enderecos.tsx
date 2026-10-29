import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAddressBook, type SavedAddress } from '../../src/addressBook/AddressBookContext';
import { colors } from '../../src/theme/colors';

export default function Enderecos() {
  const { addresses, syncStatus, retrySync } = useAddressBook();

  function openDetail(id: string) {
    router.push({ pathname: '/address-detail', params: { id } });
  }

  function renderCard({ item }: { item: SavedAddress }) {
    const title = item.placeName || item.address;
    const showSubtitle = !!item.placeName;

    return (
      <Pressable style={styles.card} onPress={() => openDetail(item.id)}>
        <View style={styles.cardTexts}>
          <Text style={styles.cardTitle}>{title}</Text>
          {showSubtitle ? <Text style={styles.cardSubtitle}>{item.address}</Text> : null}
          {item.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Endereços</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => router.push('/add-saved-address')}
        >
          <Ionicons name="add" size={22} color={colors.onAccent} />
        </Pressable>
      </View>

      {syncStatus === 'syncing' ? (
        <Text style={styles.syncHint}>Sincronizando sua lista com a conta…</Text>
      ) : null}
      {syncStatus === 'offline' ? (
        <Pressable onPress={retrySync} style={styles.syncWarning}>
          <Text style={styles.syncWarningText}>Lista salva neste aparelho. Toque para tentar sincronizar.</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderCard}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {syncStatus === 'loading' ? 'Carregando endereços…' : 'Nenhum endereço salvo ainda.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  syncHint: { color: colors.textMuted, fontSize: 12, marginBottom: 10 },
  syncWarning: { marginBottom: 10 },
  syncWarningText: { color: colors.danger, fontSize: 12 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  cardTexts: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  cardSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
