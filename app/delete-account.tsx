import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../src/auth/AuthContext';
import * as accountDeletionApi from '../src/api/accountDeletion';
import type { AccountDeletionPreview } from '../src/api/accountDeletion';
import { colors } from '../src/theme/colors';

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

export default function DeleteAccount() {
  const { token, user } = useAuth();
  const [preview, setPreview] = useState<AccountDeletionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    accountDeletionApi.getAccountDeletionPreview(token)
      .then(setPreview)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Não foi possível consultar sua assinatura.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function sendConfirmation() {
    if (!token) return;
    setSending(true);
    setError('');
    try {
      await accountDeletionApi.requestAccountDeletion(token);
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar o link. Tente novamente.');
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Entre na sua conta para continuar</Text>
        <Pressable style={styles.primaryButton} onPress={() => router.replace('/login')}>
          <Text style={styles.primaryButtonText}>Ir para login</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Voltar</Text></Pressable>
      <Text style={styles.title}>{sent ? 'Confira seu e-mail' : 'Excluir conta'}</Text>
      {sent ? (
        <View style={styles.panel}>
          <Text style={styles.body}>Enviamos um link de confirmação para {user.email}. A exclusão só começa depois que você abrir o link e confirmar novamente.</Text>
          <Text style={styles.body}>Seus dados e o acesso Pro permanecem disponíveis até a confirmação e o processamento de qualquer reembolso.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.body}>A exclusão remove sua conta e os dados associados, como endereços salvos, rotas e preferências. Para proteger sua conta, enviaremos um link de confirmação para {user.email}.</Text>
          {loading ? <ActivityIndicator color={colors.accent} /> : null}
          {preview ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Seu plano e reembolso</Text>
              {preview.refund_type === 'full' ? (
                <Text style={styles.body}>Reembolso integral estimado: {formatMoney(preview.refund_amount, preview.currency)}.</Text>
              ) : preview.refund_type === 'prorated' ? (
                <Text style={styles.body}>Reembolso proporcional estimado: {formatMoney(preview.refund_amount, preview.currency)}. Período pago até {formatDate(preview.period_end)}.</Text>
              ) : (
                <Text style={styles.body}>Não há reembolso estimado para esta conta. Se houver assinatura ativa, a renovação será cancelada.</Text>
              )}
              <Text style={styles.note}>O valor final e a data de encerramento do Pro serão confirmados no link enviado por e-mail. Quando houver reembolso, o Pro termina após o processamento.</Text>
              {!preview.deletion_enabled ? <Text style={styles.note}>A exclusão está desativada neste ambiente. Ative-a somente em um ambiente de teste isolado antes de validar o fluxo.</Text> : null}
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={[styles.primaryButton, (loading || sending || !preview || !preview.deletion_enabled) && styles.disabled]} disabled={loading || sending || !preview || !preview.deletion_enabled} onPress={sendConfirmation}>
            {sending ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.primaryButtonText}>Enviar confirmação por e-mail</Text>}
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}><Text style={styles.cancelButtonText}>Cancelar</Text></Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingTop: 60, gap: 18 },
  back: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 },
  panelTitle: { color: colors.text, fontWeight: '700', fontSize: 17 },
  note: { color: colors.textMuted, lineHeight: 20 },
  error: { color: colors.danger },
  primaryButton: { minHeight: 50, borderRadius: 10, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: colors.onAccent, fontSize: 16, fontWeight: '700' },
  cancelButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { color: colors.textMuted, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
