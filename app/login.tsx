import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function Login() {
  const { requestLoginLink, provisionalDevLogin, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      await requestLoginLink(email.trim());
      setLinkSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível enviar o link. Tente novamente.');
    } finally {
      setIsSubmitting(false);
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
        Entre ou crie uma conta usando o link de acesso enviado ao seu e-mail. Sem conta,
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
        }}
      />
      {linkSent ? (
        <Text style={styles.success}>
          Enviamos um link de acesso para {email.trim()}. Abra-o no aparelho onde o app está instalado.
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
          <Text style={styles.buttonText}>{linkSent ? 'Enviar link novamente' : 'Enviar link de acesso'}</Text>
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
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  guestButtonText: { color: colors.text, fontWeight: '600', fontSize: 15 },
  devButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  devButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
});
