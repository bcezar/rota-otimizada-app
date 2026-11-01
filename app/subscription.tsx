import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../src/api/client';
import * as accountDeletionApi from '../src/api/accountDeletion';
import * as billingApi from '../src/api/billing';
import type { AccountDeletionStatus } from '../src/api/accountDeletion';
import type { BillingAccountResponse } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

const CANCELLATION_REASONS: {
  id: billingApi.SubscriptionCancellationReason;
  label: string;
}[] = [
  { id: 'stop_limit', label: 'O limite de 50 paradas é insuficiente para mim' },
  { id: 'price', label: 'O preço não cabe no meu orçamento' },
  { id: 'not_using', label: 'Não estou usando com frequência' },
  { id: 'missing_features', label: 'Faltam recursos de que preciso' },
  { id: 'technical_issues', label: 'Tive problemas técnicos' },
  { id: 'alternative', label: 'Encontrei outro serviço' },
  { id: 'other', label: 'Outro motivo' },
];

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Não informado';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day || month > 12) return 'Não informado';
  return `${day} de ${MONTHS[month - 1]} de ${year}`;
}

function formatCurrency(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null) return 'Não informado';
  const code = currency || 'BRL';
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: code }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}

function formatPaymentMethod(value: string | null | undefined): string {
  switch (value?.toUpperCase()) {
    case 'CREDIT_CARD':
      return 'Cartão de crédito';
    case 'PIX':
      return 'Pix';
    case 'BOLETO':
      return 'Boleto';
    case 'STRIPE':
      return 'Cartão de crédito';
    default:
      return value || 'Não informado';
  }
}

export default function Subscription() {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [account, setAccount] = useState<BillingAccountResponse | null>(null);
  const [deletionStatus, setDeletionStatus] = useState<AccountDeletionStatus | null>(null);
  const [isRefreshingDeletionStatus, setIsRefreshingDeletionStatus] = useState(false);
  const [deletionStatusError, setDeletionStatusError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<
    billingApi.SubscriptionCancellationReason[]
  >([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    if (!token) {
      setError('Entre na sua conta para consultar a assinatura.');
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    billingApi
      .getAccount(token)
      .then((response) => {
        if (isCurrent) setAccount(response);
      })
      .catch((e) => {
        if (isCurrent) {
          setError(e instanceof ApiError ? e.message : 'Não foi possível carregar sua assinatura.');
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      if (!token) return () => { isCurrent = false; };

      accountDeletionApi
        .getAccountDeletionStatus(token)
        .then((response) => {
          if (isCurrent) {
            setDeletionStatus(response);
            setDeletionStatusError('');
          }
        })
        .catch(() => {
          if (isCurrent) setDeletionStatusError('Não foi possível consultar o andamento da exclusão.');
        });

      return () => {
        isCurrent = false;
      };
    }, [token]),
  );

  async function refreshDeletionStatus() {
    if (!token) return;
    setIsRefreshingDeletionStatus(true);
    setDeletionStatusError('');
    try {
      setDeletionStatus(await accountDeletionApi.getAccountDeletionStatus(token));
    } catch {
      setDeletionStatusError('Não foi possível atualizar o andamento. Tente novamente.');
    } finally {
      setIsRefreshingDeletionStatus(false);
    }
  }

  const subscription = account?.subscription;
  const isActive = subscription?.status?.toUpperCase() === 'ACTIVE';
  const expirationDate = account?.user.pro_expires_at ?? null;
  const remainsProAfterCancellation = !!account?.user.is_pro && !!expirationDate && !isActive;

  function toggleReason(reason: billingApi.SubscriptionCancellationReason) {
    setSelectedReasons((current) =>
      current.includes(reason)
        ? current.filter((item) => item !== reason)
        : [...current, reason],
    );
  }

  async function confirmCancellation() {
    if (!token) return;
    setError('');
    setIsCancelling(true);
    try {
      const result = await billingApi.cancelSubscription(token, selectedReasons);
      setAccount((current) =>
        current
          ? {
              ...current,
              user: { ...current.user, is_pro: true, pro_expires_at: result.pro_expires_at },
              subscription: null,
            }
          : current,
      );
      setConfirmationVisible(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível cancelar o plano. Tente novamente.');
    } finally {
      setIsCancelling(false);
    }
  }

  const accessDate = isActive
    ? subscription?.nextDueDate
      ? formatDate(subscription.nextDueDate)
      : 'o fim do período pago atual'
    : formatDate(expirationDate);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Plano Pro</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.accent} />
      ) : account ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isActive ? styles.statusActive : styles.statusCancelled]} />
              <Text style={styles.statusText}>
                {isActive ? 'Assinatura ativa' : remainsProAfterCancellation ? 'Renovação cancelada' : 'Plano Pro'}
              </Text>
            </View>

            {isActive ? (
              <>
                <View style={styles.divider} />
                <InfoRow label="Valor" value={`${formatCurrency(subscription?.value, subscription?.currency)} / mês`} />
                <InfoRow label="Forma de pagamento" value={formatPaymentMethod(subscription?.billingType)} />
                <InfoRow label="Próxima cobrança" value={formatDate(subscription?.nextDueDate)} />
                <Text style={styles.note}>
                  Ao cancelar, novas cobranças serão interrompidas e seu acesso Pro continuará até {accessDate}.
                </Text>
              </>
            ) : remainsProAfterCancellation ? (
              <>
                <View style={styles.divider} />
                <InfoRow label="Acesso Pro até" value={formatDate(expirationDate)} />
                <Text style={styles.note}>Não haverá novas cobranças desta assinatura.</Text>
              </>
            ) : account.user.is_pro ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.note}>
                  O Pro está ativo, mas não encontramos uma assinatura que possa ser gerenciada pelo app.
                </Text>
              </>
            ) : (
              <>
                <View style={styles.divider} />
                <Text style={styles.note}>Não encontramos uma assinatura Pro ativa nesta conta.</Text>
              </>
            )}
          </View>

          {deletionStatus && deletionStatus.status !== 'none' ? (
            <View style={styles.deletionStatusCard}>
              <Text style={styles.deletionStatusTitle}>Exclusão da conta</Text>
              <Text style={styles.note}>
                {deletionStatus.status === 'awaiting_confirmation'
                  ? 'Aguardando você confirmar o pedido pelo link enviado por e-mail. Sua conta continua ativa até essa confirmação.'
                  : deletionStatus.status === 'awaiting_authorization'
                    ? 'O reembolso aguarda autorização no Asaas. A exclusão será concluída depois que o reembolso for processado.'
                    : deletionStatus.status === 'refund_completed'
                      ? 'O reembolso foi confirmado. Estamos finalizando a exclusão da conta.'
                      : 'O reembolso está em processamento. A exclusão será concluída após a confirmação do provedor de pagamento.'}
              </Text>
              {deletionStatus.refresh_failed ? (
                <Text style={styles.note}>Não conseguimos consultar o status atualizado no provedor agora.</Text>
              ) : null}
              {deletionStatusError ? <Text style={styles.errorText}>{deletionStatusError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                style={styles.refreshButton}
                disabled={isRefreshingDeletionStatus}
                onPress={() => void refreshDeletionStatus()}
              >
                {isRefreshingDeletionStatus ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={styles.refreshButtonText}>Atualizar status</Text>
                )}
              </Pressable>
            </View>
          ) : deletionStatusError ? (
            <Text style={styles.errorText}>{deletionStatusError}</Text>
          ) : null}

          {isActive ? (
            <Pressable style={styles.cancelButton} onPress={() => setConfirmationVisible(true)}>
              <Text style={styles.cancelButtonText}>Cancelar plano</Text>
            </Pressable>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Não foi possível carregar sua assinatura.'}</Text>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Voltar</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={confirmationVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isCancelling && setConfirmationVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Confirmar cancelamento</Text>
              <Text style={styles.modalWarning}>
                As cobranças futuras serão interrompidas. Seu acesso Pro continuará até {accessDate}.
                Depois, o plano gratuito permitirá otimizações com até 5 paradas por rota.
              </Text>
              <Text style={styles.reasonTitle}>Se quiser, conte o motivo (opcional)</Text>
              {CANCELLATION_REASONS.map((reason) => {
                const selected = selectedReasons.includes(reason.id);
                return (
                  <Pressable
                    key={reason.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={styles.reasonRow}
                    onPress={() => toggleReason(reason.id)}
                  >
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={selected ? colors.accent : colors.textMuted}
                    />
                    <Text style={styles.reasonText}>{reason.label}</Text>
                  </Pressable>
                );
              })}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              style={[styles.confirmButton, isCancelling && styles.disabledButton]}
              disabled={isCancelling}
              onPress={() => void confirmCancellation()}
            >
              {isCancelling ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.confirmButtonText}>Confirmar cancelamento</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.keepButton}
              disabled={isCancelling}
              onPress={() => setConfirmationVisible(false)}
            >
              <Text style={styles.keepButtonText}>Manter meu plano</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  headerSpacer: { width: 24 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  loading: { marginTop: 40 },
  content: { gap: 16, paddingBottom: 28 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  deletionStatusCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  deletionStatusTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  refreshButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  refreshButtonText: { color: colors.accent, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusActive: { backgroundColor: colors.success },
  statusCancelled: { backgroundColor: colors.textMuted },
  statusText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border },
  infoRow: { gap: 4 },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  note: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 16,
  },
  cancelButtonText: { color: colors.danger, fontWeight: '700' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  errorText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
  secondaryButton: { padding: 12 },
  secondaryButtonText: { color: colors.textMuted, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 22,
    paddingHorizontal: 20,
    gap: 10,
  },
  modalTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginBottom: 4 },
  modalWarning: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
  },
  reasonTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 6 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  reasonText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 19 },
  confirmButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  confirmButtonText: { color: colors.onAccent, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  keepButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  keepButtonText: { color: colors.text, fontWeight: '600' },
});
