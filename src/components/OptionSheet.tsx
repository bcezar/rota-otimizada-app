import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';

interface Option {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  options: Option[];
}

export function OptionSheet({ visible, onClose, title, options }: Props) {
  const insets = useSafeAreaInsets();

  function handleSelect(onPress: () => void) {
    onPress();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 24, 64) }]}
          onPress={() => {}}
        >
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {options.map((option) => (
            <Pressable
              key={option.label}
              style={[styles.option, option.disabled && styles.optionDisabled]}
              disabled={option.disabled}
              onPress={() => handleSelect(option.onPress)}
            >
              <Text style={[styles.optionText, option.disabled && styles.optionTextDisabled]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 4,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontSize: 15,
  },
  optionDisabled: {
    opacity: 0.55,
  },
  optionTextDisabled: {
    color: colors.textMuted,
  },
  cancelButton: {
    minHeight: 48,
    marginTop: 12,
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
