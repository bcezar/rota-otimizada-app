import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import * as billingApi from '../src/api/billing';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

type BillingType = 'PIX' | 'CREDIT_CARD';

const BENEFITS = [
  'Até 50 paradas por rota',
  'Otimizações ilimitadas',
  'Rotas salvas ilimitadas',
];

export default function Upgrade() {
  const { token } = useAuth();
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [billingType, setBillingType] = useState<BillingType>('PIX');
  const [couponCode, setCouponCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!token) return;
    setError('');
    setIsSubmitting(true);
    try {
      const digits = cpfCnpj.replace(/\D/g, '');
      const result = await billingApi.checkout(token, {
        cpfCnpj: digits,
        billingType,
        couponCode: couponCode.trim() || undefined,
      });
      if (result.payment_url) {
        await WebBrowser.openBrowserAsync(result.payment_url);
        router.back();
      } else if (result.coupon_applied) {
        router.back();
      } else {
        setError('Não foi possível iniciar o pagamento.');
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível iniciar o upgrade.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.closeButton} onPress={() => router.back()}>
        <Ionicons name="close" size={22} color={colors.textMuted} />
      </Pressable>

      <View style={styles.header}>
        <Ionicons name="star" size={28} color="#7c3aed" />
        <Text style={styles.title}>Plano Pro</Text>
        <Text style={styles.price}>R$ 29,90/mês</Text>
      </View>

      <View style={styles.benefitsList}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.fieldLabel}>CPF ou CNPJ</Text>
      <TextInput
        style={styles.input}
        placeholder="CPF ou CNPJ"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        value={cpfCnpj}
        onChangeText={setCpfCnpj}
      />

      <View style={styles.billingTypeRow}>
        <Pressable
          style={[styles.billingTypeButton, billingType === 'PIX' && styles.billingTypeActive]}
          onPress={() => setBillingType('PIX')}
        >
          <Text
            style={[
              styles.billingTypeText,
              billingType === 'PIX' && styles.billingTypeTextActive,
            ]}
          >
            Pix
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.billingTypeButton,
            billingType === 'CREDIT_CARD' && styles.billingTypeActive,
          ]}
          onPress={() => setBillingType('CREDIT_CARD')}
        >
          <Text
            style={[
              styles.billingTypeText,
              billingType === 'CREDIT_CARD' && styles.billingTypeTextActive,
            ]}
          >
            Cartão
          </Text>
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>Cupom de desconto (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Código do cupom"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        value={couponCode}
        onChangeText={setCouponCode}
      />
      {couponCode.trim() ? (
        <Text style={styles.couponHint}>
          Você pode receber um e-mail do Asaas sobre a próxima cobrança — ela só será feita
          depois do primeiro mês grátis.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submitButton, (!cpfCnpj || isSubmitting) && styles.buttonDisabled]}
        disabled={!cpfCnpj || isSubmitting}
        onPress={handleSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.submitButtonText}>Continuar para pagamento</Text>
        )}
      </Pressable>

      <Text style={styles.footerNote}>
        Pagamento processado pelo Asaas. Cancele quando quiser.
      </Text>
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
    gap: 12,
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  price: {
    color: colors.textMuted,
    fontSize: 14,
  },
  benefitsList: {
    gap: 8,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    color: colors.text,
    fontSize: 14,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
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
  couponHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  billingTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  billingTypeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  billingTypeActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  billingTypeText: {
    color: colors.text,
    fontWeight: '600',
  },
  billingTypeTextActive: {
    color: colors.onAccent,
  },
  error: {
    color: colors.danger,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
  footerNote: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
