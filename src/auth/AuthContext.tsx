import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import * as authApi from '../api/auth';
import type { LoginResponse, UserResponse } from '../api/types';

const TOKEN_KEY = 'auth_token';
const GUEST_MODE_KEY = 'guest_mode';

interface AuthContextValue {
  isLoading: boolean;
  isGuest: boolean;
  token: string | null;
  user: UserResponse | null;
  requestLoginLink: (email: string) => Promise<void>;
  provisionalDevLogin: (email: string) => Promise<void>;
  completeLogin: (session: LoginResponse) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);

  useEffect(() => {
    (async () => {
      const [storedToken, storedGuestMode] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        AsyncStorage.getItem(GUEST_MODE_KEY),
      ]);
      if (!storedToken) {
        setIsGuest(storedGuestMode === 'true');
        setIsLoading(false);
        return;
      }
      try {
        const currentUser = await authApi.me(storedToken);
        setToken(storedToken);
        setUser(currentUser);
        setIsGuest(false);
      } catch {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setIsGuest(storedGuestMode === 'true');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function requestLoginLink(email: string) {
    await authApi.requestMagicLink(email);
  }

  async function provisionalDevLogin(email: string) {
    const session = await authApi.provisionalDevLogin(email);
    await completeLogin(session);
  }

  async function completeLogin(session: LoginResponse) {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setToken(session.token);
    setUser(session.user);
    setIsGuest(false);
  }

  async function continueAsGuest() {
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
    setIsGuest(true);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
    setToken(null);
    setUser(null);
    setIsGuest(false);
  }

  return (
    <AuthContext.Provider value={{
      isLoading,
      isGuest,
      token,
      user,
      requestLoginLink,
      provisionalDevLogin,
      completeLogin,
      continueAsGuest,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
