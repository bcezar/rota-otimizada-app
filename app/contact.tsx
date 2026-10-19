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

import { ApiError } from '../src/api/client';
import * as contactApi from '../src/api/contact';
import { useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme/colors';

export default function Contact() {
  const { user, token } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      await contactApi.sendContact(email.trim(), message.trim(), token);
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível enviar sua mensagem.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mensagem enviada!</Text>
        <Text style={styles.subtitle}>Obrigado pelo contato, responderemos em breve.</Text>
        <Pressable style={styles.submitButton} onPress={() => router.back()}>
          <Text style={styles.submitButtonText}>Fechar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fale conosco</Text>

      <TextInput
        style={styles.input}
        placeholder="Seu e-mail"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder="Sua mensagem"
        placeholderTextColor={colors.textMuted}
        multiline
        value={message}
        onChangeText={setMessage}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={[
          styles.submitButton,
          (!email || !message || isSubmitting) && styles.buttonDisabled,
        ]}
        disabled={!email || !message || isSubmitting}
        onPress={handleSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <Text style={styles.submitButtonText}>Enviar</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancelButton} onPress={() => router.back()}>
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
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
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  cancelButton: {
    alignItems: 'center',
    padding: 14,
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
