import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import * as authApi from '../../src/api/auth';
import { useAuth } from '../../src/auth/AuthContext';
import { colors } from '../../src/theme/colors';

export default function AuthCallback() {
  const { code, error: linkError } = useLocalSearchParams<{ code?: string; error?: string }>();
  const { completeLogin } = useAuth();
  const handled = useRef(false);
  const [message, setMessage] = useState('Validando seu link de acesso…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    if (linkError || !code || Array.isArray(code)) {
      setMessage(linkError === 'expired'
        ? 'Este link expirou ou já foi usado. Volte e solicite outro.'
        : 'Este link de acesso é inválido. Volte e solicite outro.');
      setFailed(true);
      return;
    }

    authApi.exchangeMobileCode(code)
      .then(async (session) => {
        await completeLogin(session);
        router.replace('/navegacao');
      })
      .catch((cause: unknown) => {
        setMessage(cause instanceof Error ? cause.message : 'Não foi possível validar o link. Solicite outro.');
        setFailed(true);
      });
  }, [code, linkError, completeLogin]);

  return (
    <View style={styles.container}>
      {!failed ? <ActivityIndicator size="large" color={colors.accent} /> : null}
      <Text style={styles.message}>{message}</Text>
      {failed ? (
        <Pressable style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Voltar ao login</Text>
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
    alignItems: 'center',
    padding: 28,
    gap: 20,
  },
  message: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  buttonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
});
