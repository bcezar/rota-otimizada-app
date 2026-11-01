import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

interface SafeAreaScreenProps extends PropsWithChildren {
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
}

export function SafeAreaScreen({
  children,
  edges = ['top', 'right', 'bottom', 'left'],
  style,
}: SafeAreaScreenProps) {
  return (
    <SafeAreaView edges={edges} style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
