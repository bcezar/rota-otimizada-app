import { router } from 'expo-router';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../../src/auth/AuthContext';
import { OptionSheet } from '../../src/components/OptionSheet';
import { SettingsRow } from '../../src/components/SettingsRow';
import {
  usePreferences,
  type DistanceUnit,
  type NavigationApp,
  type VehicleType,
} from '../../src/preferences/PreferencesContext';
import { colors } from '../../src/theme/colors';

const NAVIGATION_APPS: { value: NavigationApp; label: string }[] = [
  { value: 'ask_always', label: 'Sempre Perguntar' },
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'waze', label: 'Waze' },
  { value: 'apple_maps', label: 'Apple Maps' },
];

const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'mi' },
];

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Carro' },
  { value: 'truck', label: 'Caminhão' },
  { value: 'motorcycle', label: 'Motocicleta' },
  { value: 'bicycle', label: 'Bicicleta' },
];

export default function Conta() {
  const { user, logout } = useAuth();
  const {
    defaultOrigin,
    defaultDestination,
    destinationMode,
    setDestinationMode,
    navigationApp,
    setNavigationApp,
    distanceUnit,
    setDistanceUnit,
    vehicleType,
    setVehicleType,
  } = usePreferences();
  const [destinationSheetVisible, setDestinationSheetVisible] = useState(false);

  const planLabel = user?.is_exclusive ? 'Exclusive' : user?.is_pro ? 'Pro' : 'Gratuito';
  const canUpgrade = !!user && !user.is_pro && !user.is_exclusive;
  const avatarInitial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const destinationLabel =
    destinationMode === 'return_to_origin'
      ? 'Retornar ao início'
      : destinationMode === 'custom'
        ? defaultDestination
        : 'Não especificado';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Seção 1 — Perfil / Plano */}
      <View style={styles.section}>
        {user ? (
          <>
            <View style={styles.profileRow}>
              {user.picture_url ? (
                <Image source={{ uri: user.picture_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
                </View>
              )}
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{user.name || user.email}</Text>
                <Text style={styles.email}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.planRow}>
              <Text style={styles.planLabel}>Plano atual</Text>
              <Text style={styles.planValue}>{planLabel}</Text>
            </View>

            {canUpgrade ? (
              <Pressable style={styles.upgradeButton} onPress={() => router.push('/upgrade')}>
                <Text style={styles.upgradeButtonText}>Upgrade de plano</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Modo visitante</Text>
            <Text style={styles.sectionNote}>
              Você tem 5 otimizações por dia, com até 5 paradas por rota. Entre ou crie uma
              conta gratuita para otimizações ilimitadas e acesso às rotas salvas.
            </Text>
            <Pressable style={styles.upgradeButton} onPress={() => router.push('/login')}>
              <Text style={styles.upgradeButtonText}>Entrar ou criar conta</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Seção 2 — Preferências */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações preferenciais</Text>
        <Text style={styles.sectionNote}>
          Essas preferências ficam salvas apenas neste dispositivo por enquanto e ainda
          não afetam a otimização de rota.
        </Text>

        <SettingsRow
          label="Endereço de início padrão"
          value={defaultOrigin || 'Nenhum selecionado'}
          onPress={() => router.push({ pathname: '/pick-default-address', params: { target: 'origin' } })}
        />
        <SettingsRow
          label="Endereço de fim padrão"
          value={destinationLabel}
          onPress={() => setDestinationSheetVisible(true)}
        />

        <Text style={styles.fieldLabel}>App de navegação</Text>
        <View style={styles.chipsRow}>
          {NAVIGATION_APPS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.chip, navigationApp === item.value && styles.chipActive]}
              onPress={() => setNavigationApp(item.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  navigationApp === item.value && styles.chipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Unidade de distância</Text>
        <View style={styles.chipsRow}>
          {DISTANCE_UNITS.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.chip, distanceUnit === item.value && styles.chipActive]}
              onPress={() => setDistanceUnit(item.value)}
            >
              <Text
                style={[styles.chipText, distanceUnit === item.value && styles.chipTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Tipo de veículo</Text>
        <View style={styles.chipsRow}>
          {VEHICLE_TYPES.map((item) => (
            <Pressable
              key={item.value}
              style={[styles.chip, vehicleType === item.value && styles.chipActive]}
              onPress={() => setVehicleType(item.value)}
            >
              <Text
                style={[styles.chipText, vehicleType === item.value && styles.chipTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Seção 3 — Ajuda */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ajuda</Text>
        <Pressable style={styles.linkRow} onPress={() => router.push('/faq')}>
          <Text style={styles.linkText}>FAQ</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => router.push('/contact')}>
          <Text style={styles.linkText}>Fale Conosco</Text>
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => router.push('/about')}>
          <Text style={styles.linkText}>Sobre nós</Text>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => void WebBrowser.openBrowserAsync('https://rotaotimizada.com.br/privacidade')}
        >
          <Text style={styles.linkText}>Política de Privacidade</Text>
        </Pressable>
        <Pressable
          style={styles.linkRow}
          onPress={() => void WebBrowser.openBrowserAsync('https://rotaotimizada.com.br/termos-de-uso')}
        >
          <Text style={styles.linkText}>Termos de Uso</Text>
        </Pressable>
      </View>

      {/* Seção 4 — Excluir conta */}
      {user ? (
        <View style={styles.section}>
          <Pressable style={styles.deleteButton} onPress={() => router.push('/delete-account')}>
            <Text style={styles.deleteButtonText}>Excluir conta</Text>
          </Pressable>
        </View>
      ) : null}

      {user ? (
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair</Text>
        </Pressable>
      ) : null}

      <OptionSheet
        visible={destinationSheetVisible}
        onClose={() => setDestinationSheetVisible(false)}
        title="Endereço de fim padrão"
        options={[
          { label: 'Retornar ao início', onPress: () => setDestinationMode('return_to_origin') },
          {
            label: 'Escolher endereço',
            onPress: () =>
              router.push({ pathname: '/pick-default-address', params: { target: 'destination' } }),
          },
          { label: 'Não especificado', onPress: () => setDestinationMode('none') },
        ]}
      />
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
    paddingTop: 60,
    gap: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: colors.onAccent,
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  email: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    color: colors.textMuted,
  },
  planValue: {
    color: colors.text,
    fontWeight: '700',
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionNote: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.onAccent,
  },
  linkRow: {
    paddingVertical: 10,
  },
  linkText: {
    color: colors.text,
    fontSize: 14,
  },
  deleteButton: {
    alignItems: 'center',
    padding: 4,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: '100%',
  },
  logoutButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
