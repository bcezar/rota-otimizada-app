import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isUserCancelledError, useIAP, type Purchase } from 'expo-iap';

import * as billingApi from '../src/api/billing';
import { ApiError } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

const PRODUCT_ID = 'rota_pro_monthly';
const BENEFITS = [
  'Até 50 paradas por rota',
  'Otimizações ilimitadas',
  'Rotas salvas ilimitadas',
];

export default function UpgradeAndroid() {
  const { token, user, refreshUser } = useAuth();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restoreRequested, setRestoreRequested] = useState(false);
  const [restoreFetchComplete, setRestoreFetchComplete] = useState(false);
  const processedTokens = useRef(new Set<string>());
  const iapRef = useRef<{ finishTransaction: (args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void> } | null>(null);

  const handlePurchase = useCallback(async (purchase: Purchase) => {
    if (purchase.productId !== PRODUCT_ID) return;
    if (purchase.purchaseState !== 'purchased') {
      setError('A compra ainda está pendente de confirmação pela Google Play.');
      setIsSubmitting(false);
      return;
    }
    if (!token || !purchase.purchaseToken) {
      setError('Não foi possível validar a compra. Entre na sua conta e tente restaurar a compra.');
      setIsSubmitting(false);
      return;
    }
    if (processedTokens.current.has(purchase.purchaseToken)) return;
    setIsSubmitting(true);
    setError('');
    try {
      await billingApi.verifyGooglePlayPurchase(token, {
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken,
      });
      await iapRef.current?.finishTransaction({ purchase, isConsumable: false });
      processedTokens.current.add(purchase.purchaseToken);
      await refreshUser();
      router.back();
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'A compra foi recebida, mas não conseguimos confirmar o Pro. Tente restaurar a compra.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshUser, token]);

  const handlePurchaseError = useCallback((purchaseError: unknown) => {
    if (isUserCancelledError(purchaseError)) return;
    setError(purchaseError instanceof Error
      ? purchaseError.message
      : 'A compra não pôde ser concluída pela Google Play.');
    setIsSubmitting(false);
  }, []);

  const {
    connected,
    subscriptions,
    availablePurchases,
    fetchProducts,
    finishTransaction,
    getAvailablePurchases,
    requestPurchase,
  } = useIAP({ onPurchaseSuccess: handlePurchase, onPurchaseError: handlePurchaseError });
  iapRef.current = { finishTransaction };

  const monthlyProduct = subscriptions.find((item) => item.id === PRODUCT_ID);

  useEffect(() => {
    if (connected) {
      void fetchProducts({ skus: [PRODUCT_ID], type: 'subs' }).catch(() => {
        setError('Não foi possível carregar o preço da assinatura na Google Play.');
      });
    }
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!restoreRequested || !restoreFetchComplete) return;
    const purchases = availablePurchases.filter(
      (purchase) => purchase.productId === PRODUCT_ID && purchase.purchaseState === 'purchased',
    );
    if (!purchases.length) {
      setError('Não encontramos uma assinatura ativa nesta conta Google.');
      setIsSubmitting(false);
      setRestoreRequested(false);
      setRestoreFetchComplete(false);
      return;
    }
    void handlePurchase(purchases[0]).finally(() => {
      setRestoreRequested(false);
      setRestoreFetchComplete(false);
    });
  }, [availablePurchases, handlePurchase, restoreFetchComplete, restoreRequested]);

  async function startPurchase() {
    if (!token || !user?.id) {
      setError('Entre na sua conta antes de assinar o Plano Pro.');
      return;
    }
    const offer = monthlyProduct?.subscriptionOffers?.find((item) => item.offerTokenAndroid);
    if (!monthlyProduct || !offer?.offerTokenAndroid) {
      setError('A assinatura ainda não está disponível na Google Play. Tente novamente mais tarde.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await requestPurchase({
        type: 'subs',
        request: {
          google: {
            skus: [PRODUCT_ID],
            subscriptionOffers: [{ sku: PRODUCT_ID, offerToken: offer.offerTokenAndroid }],
            obfuscatedAccountId: user?.id,
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar a compra.');
      setIsSubmitting(false);
    }
  }

  async function restorePurchase() {
    if (!token) {
      setError('Entre na sua conta para restaurar uma compra.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    setRestoreRequested(true);
    setRestoreFetchComplete(false);
    try {
      await getAvailablePurchases();
      setRestoreFetchComplete(true);
    } catch {
      setError('Não foi possível consultar as compras da Google Play.');
      setIsSubmitting(false);
      setRestoreRequested(false);
      setRestoreFetchComplete(false);
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
        <Text style={styles.price}>
          {monthlyProduct?.displayPrice ? `${monthlyProduct.displayPrice} / mês` : 'Assinatura mensal'}
        </Text>
      </View>

      <View style={styles.benefitsList}>
        {BENEFITS.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {user?.is_pro ? (
        <Text style={styles.alreadyPro}>
          Esta conta já tem acesso ao Plano Pro. Gerencie a assinatura pelo provedor que fez a cobrança.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[styles.submitButton, (!connected || !monthlyProduct || isSubmitting || user?.is_pro) && styles.buttonDisabled]}
        disabled={!connected || !monthlyProduct || isSubmitting || !!user?.is_pro}
        onPress={() => void startPurchase()}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.submitButtonText}>
            {user?.is_pro ? 'Plano Pro já ativo' : 'Assinar com Google Play'}
          </Text>
        )}
      </Pressable>

      <Pressable style={styles.restoreButton} disabled={isSubmitting} onPress={() => void restorePurchase()}>
        <Text style={styles.restoreButtonText}>Restaurar compra</Text>
      </Pressable>

      <Text style={styles.footerNote}>
        Pagamento e renovação gerenciados pela Google Play. Cancele a qualquer momento nas assinaturas da sua conta Google.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 16, paddingBottom: 40 },
  closeButton: { alignSelf: 'flex-end' },
  header: { alignItems: 'center', gap: 4, marginBottom: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  price: { color: colors.textMuted, fontSize: 14 },
  benefitsList: { gap: 12, marginBottom: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { color: colors.text, fontSize: 14 },
  error: { color: colors.danger, fontSize: 14 },
  alreadyPro: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: 16,
    minHeight: 54,
  },
  buttonDisabled: { opacity: 0.55 },
  submitButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  restoreButton: { alignItems: 'center', padding: 12 },
  restoreButtonText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  footerNote: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
