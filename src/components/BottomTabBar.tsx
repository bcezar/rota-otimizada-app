import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

// expo-router não exporta o tipo das props da tab bar publicamente (só via
// caminhos internos do pacote) — extraímos o tipo real a partir da própria
// prop `tabBar` do `<Tabs>`, evitando duplicar/arriscar um tipo manual.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  navegacao: 'navigate-outline',
  enderecos: 'location-outline',
  otimizar: 'flash',
  importar: 'cloud-upload-outline',
  conta: 'person-outline',
};

const LABELS: Record<string, string> = {
  navegacao: 'Navegação',
  enderecos: 'Endereços',
  otimizar: 'Otimizar',
  importar: 'Importar',
  conta: 'Conta',
};

export function BottomTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isCenter = route.name === 'otimizar';
        const iconName = ICONS[route.name] ?? 'ellipse-outline';
        const label = LABELS[route.name] ?? route.name;

        function handlePress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        if (isCenter) {
          return (
            <View key={route.key} style={styles.centerItemWrapper}>
              <Pressable style={styles.centerButton} onPress={handlePress}>
                <Ionicons name={iconName} size={28} color={colors.onAccent} />
              </Pressable>
              <Text style={styles.centerLabel}>{label}</Text>
            </View>
          );
        }

        return (
          <Pressable key={route.key} style={styles.item} onPress={handlePress}>
            <Ionicons
              name={iconName}
              size={22}
              color={isFocused ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.label, isFocused && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
  centerItemWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  centerLabel: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    marginTop: 2,
  },
});
