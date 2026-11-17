import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function Login() {
  const { requestLoginLink, verifyLoginCode, provisionalDevLogin, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const [hasSentCode, setHasSentCode] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleSubmit() {
    if (hasSentCode) {
      if (resendCooldown > 0) {
        setLinkSent(true);
        return;
      }
      await handleResendCode();
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await requestLoginLink(email.trim());
      setLinkSent(true);
      setHasSentCode(true);
      setResendCooldown(30);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o link. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || isSubmitting || isVerifyingCode) return;
    setError('');
    setIsSubmitting(true);
    try {
      await requestLoginLink(email.trim());
      setLinkSent(true);
      setAccessCode('');
      setCodeError('');
      setResendCooldown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível reenviar o código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCode() {
    setCodeError('');
    setIsVerifyingCode(true);
    try {
      await verifyLoginCode(email.trim(), accessCode.trim());
      router.replace('/navegacao');
    } catch (e) {
      setCodeError(e instanceof Error ? e.message : 'Código inválido ou expirado. Solicite outro e-mail.');
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function handleContinueAsGuest() {
    await continueAsGuest();
    router.replace('/navegacao');
  }

  async function handleProvisionalLogin() {
    setError('');
    setIsSubmitting(true);
    try {
      await provisionalDevLogin(email.trim());
      router.replace('/navegacao');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login provisório indisponível.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rota Otimizada</Text>
      <Text style={styles.subtitle}>
        Entre ou crie uma conta usando o link ou o código enviados ao seu e-mail. Sem conta,
        você tem 5 otimizações por dia, com até 5 paradas por rota.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="seu@email.com"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setLinkSent(false);
          setHasSentCode(false);
          setAccessCode('');
          setCodeError('');
          setResendCooldown(0);
        }}
      />
      {linkSent ? (
        <Text style={styles.success}>
          Enviamos um link e um código para {email.trim()}. Abra o link no aparelho ou digite o código aqui.
          Confira também a caixa de spam.
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        style={[styles.button, (!email.trim() || isSubmitting) && styles.buttonDisabled]}
        disabled={!email.trim() || isSubmitting}
        onPress={handleSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>
      <Pressable
        style={styles.guestButton}
        disabled={isSubmitting}
        onPress={() => void handleContinueAsGuest()}
      >
        <Text style={styles.guestButtonText}>Continuar sem conta</Text>
      </Pressable>
      {__DEV__ ? (
        <Pressable
          style={[styles.devButton, (!email.trim() || isSubmitting) && styles.buttonDisabled]}
          disabled={!email.trim() || isSubmitting}
          onPress={() => void handleProvisionalLogin()}
        >
          <Text style={styles.devButtonText}>Login provisório (desenvolvimento)</Text>
        </Pressable>
      ) : null}
      {__DEV__ ? (
        <Pressable
          style={styles.textDiagnosticLink}
          accessibilityRole="button"
          onPress={() => router.push('/debug-text')}
        >
          <Text style={styles.textDiagnosticLinkLabel}>Diagnóstico de texto (dev)</Text>
        </Pressable>
      ) : null}
      <Modal
        visible={linkSent}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLinkSent(false)}
      >
        <View style={styles.codeModalOverlay}>
          <View style={styles.codeModalCard}>
            <Text style={styles.codeTitle}>Digite o código do e-mail</Text>
            <Text style={styles.codeDescription}>
              Enviamos um link e um código para {email.trim()}. O link vale por 15 minutos e o código por 30.
            </Text>
            <TextInput
              style={styles.codeInput}
              accessibilityLabel="Código de acesso enviado por e-mail"
              placeholder="0000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={4}
              autoFocus
              value={accessCode}
              onChangeText={(value) => {
                setAccessCode(value.replace(/\D/g, '').slice(0, 4));
                setCodeError('');
              }}
            />
            {codeError ? <Text style={styles.error}>{codeError}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={[styles.button, (accessCode.length !== 4 || isVerifyingCode) && styles.buttonDisabled]}
              disabled={accessCode.length !== 4 || isVerifyingCode}
              onPress={() => void handleVerifyCode()}
            >
              {isVerifyingCode ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.buttonText}>Confirmar código</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={resendCooldown > 0 || isSubmitting || isVerifyingCode}
              onPress={() => void handleResendCode()}
              style={styles.resendCodeLink}
            >
              <Text style={[styles.resendCodeText, resendCooldown > 0 && styles.resendCodeDisabled]}>
                {resendCooldown > 0 ? `Reenviar código em ${resendCooldown}s` : 'Reenviar código'}
              </Text>
            </Pressable>
            <Pressable
              style={styles.codeSecondaryButton}
              disabled={isSubmitting || isVerifyingCode}
              onPress={() => {
                setLinkSent(false);
                setAccessCode('');
                setCodeError('');
              }}
            >
              <Text style={styles.guestButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
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
  error: {
    color: colors.danger,
  },
  success: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    width: '100%',
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  guestButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  guestButtonText: {
    width: '100%',
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  devButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  devButtonText: {
    width: '100%',
    color: colors.accent,
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  textDiagnosticLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  textDiagnosticLinkLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  codeModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  codeModalCard: {
    width: '100%',
    padding: 20,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  codeTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  codeDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    borderRadius: 10,
    padding: 14,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 5,
    textAlign: 'center',
  },
  codeSecondaryButton: {
    alignItems: 'center',
    padding: 12,
  },
  resendCodeLink: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  resendCodeText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  resendCodeDisabled: {
    color: colors.textMuted,
  },
});
