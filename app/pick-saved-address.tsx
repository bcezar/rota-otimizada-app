import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAddressBook, type SavedAddress } from '../src/addressBook/AddressBookContext';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function PickSavedAddress() {
  const { addresses } = useAddressBook();
  const { stops, addStop, removeStop } = useStops();

  function isInRoute(address: string): boolean {
    return stops.some((stop) => stop.address === address);
  }

  function handleToggle(item: SavedAddress) {
    if (isInRoute(item.address)) {
      const stop = stops.find((s) => s.address === item.address);
      if (stop) removeStop(stop.id);
    } else {
      addStop(item.address);
    }
  }

  function renderItem({ item }: { item: SavedAddress }) {
    const title = item.placeName || item.address;
    const showSubtitle = !!item.placeName;
    return (
      <View style={styles.row}>
        <View style={styles.rowTexts}>
          <Text style={styles.rowTitle}>{title}</Text>
          {showSubtitle ? <Text style={styles.rowSubtitle}>{item.address}</Text> : null}
        </View>
        <Switch
          value={isInRoute(item.address)}
          onValueChange={() => handleToggle(item)}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.onAccent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lista de endereços</Text>
        <Pressable onPress={() => router.dismissTo('/otimizar')}>
          <Text style={styles.closeText}>Concluir</Text>
        </Pressable>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum endereço salvo ainda.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});
