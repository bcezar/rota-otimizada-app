import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../src/theme/colors';

export default function Otimizar() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Otimizar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
});
