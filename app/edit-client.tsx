import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAddressBook } from '../src/addressBook/AddressBookContext';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function EditClient() {
  const { id, source } = useLocalSearchParams<{
    id: string;
    source?: 'stop' | 'address';
  }>();
  const isStop = source === 'stop';
  const { addresses, updateAddress } = useAddressBook();
  const { stops, updateStop } = useStops();
  const current = isStop
    ? stops.find((item) => item.id === id)
    : addresses.find((item) => item.id === id);

  const [name, setName] = useState(current?.client?.name ?? '');
  const [email, setEmail] = useState(current?.client?.email ?? '');
  const [phone, setPhone] = useState(current?.client?.phone ?? '');

  function handleSave() {
    if (!id) return;
    const client =
      name.trim() || email.trim() || phone.trim()
        ? { name: name.trim(), email: email.trim(), phone: phone.trim() }
        : null;
    if (isStop) {
      updateStop(id, { client });
    } else {
      updateAddress(id, { client });
    }
    router.back();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cliente</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Nome do cliente"
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Pressable style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Salvar</Text>
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
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
});
