import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

interface Props {
  label: string;
  value?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SettingsRow({ label, value, onPress, icon }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      {icon ? (
        <View style={styles.iconWrapper}>
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    alignItems: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.text,
    fontSize: 14,
  },
  value: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
