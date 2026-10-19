import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../src/theme/colors';

export default function About() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sobre nós</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>
      <ScrollView>
        <Text style={styles.paragraph}>
          O Rota Otimizada nasceu para resolver um problema simples: encontrar a melhor
          ordem de visita entre vários endereços, economizando tempo e distância em
          entregas, visitas e trajetos do dia a dia.
        </Text>
        <Text style={styles.paragraph}>
          Usamos cálculo de distâncias reais de estrada e algoritmos de otimização para
          sugerir a rota mais eficiente — tudo em poucos segundos.
        </Text>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: '700',
  },
  closeText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  paragraph: {
    color: colors.text,
    lineHeight: 22,
    marginBottom: 16,
  },
});
