import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../src/theme/colors';

const FAQ_ITEMS = [
  {
    question: 'Como funciona a otimização de rota?',
    answer:
      'Você adiciona os endereços que precisa visitar e nós calculamos a ordem mais eficiente de visita, considerando distâncias reais de estrada.',
  },
  {
    question: 'Quantas paradas posso adicionar?',
    answer:
      'O plano gratuito permite até 5 paradas por rota. Os planos Pro e Exclusive aumentam esse limite.',
  },
  {
    question: 'Preciso de internet para usar o app?',
    answer:
      'Sim, a busca de endereços e o cálculo da rota otimizada precisam de conexão com a internet.',
  },
  {
    question: 'Como faço upgrade do meu plano?',
    answer:
      'Na aba Conta, toque em "Upgrade de plano" e siga o fluxo de pagamento via PIX ou cartão.',
  },
  {
    question: 'O que acontece com meu plano Pro se eu excluir minha conta?',
    answer:
      'A renovação será cancelada. Quando houver um período Pro pago ainda não utilizado, solicitaremos o reembolso proporcional; se a contratação online tiver ocorrido nos últimos 7 dias, o reembolso será integral quando aplicável. O acesso Pro termina após o processamento do reembolso. Antes de confirmar a exclusão, mostraremos o valor estimado. A aplicação do prazo legal a renovações pode depender do caso.',
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perguntas frequentes</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeText}>Fechar</Text>
        </Pressable>
      </View>

      <ScrollView>
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <Pressable
              key={item.question}
              style={styles.item}
              onPress={() => setOpenIndex(isOpen ? null : index)}
            >
              <Text style={styles.question}>{item.question}</Text>
              {isOpen ? <Text style={styles.answer}>{item.answer}</Text> : null}
            </Pressable>
          );
        })}
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
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  question: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  answer: {
    color: colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
});
