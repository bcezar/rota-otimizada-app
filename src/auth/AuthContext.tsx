import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as authApi from '../api/auth';
import type { LoginResponse, UserResponse } from '../api/types';

const TOKEN_KEY = 'auth_token';
const GUEST_MODE_KEY = 'guest_mode';
type ProActivationStatus = 'idle' | 'checking' | 'confirmed' | 'pending';

interface AuthContextValue {
  isLoading: boolean;
  isGuest: boolean;
  token: string | null;
  user: UserResponse | null;
  proActivationStatus: ProActivationStatus;
  refreshUser: () => Promise<UserResponse | null>;
  beginProActivationCheck: () => void;
  verifyProActivation: () => Promise<void>;
  clearProActivationStatus: () => void;
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
  const [proActivationStatus, setProActivationStatus] = useState<ProActivationStatus>('idle');
  const activationCheckInProgress = useRef(false);

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    try {
      const currentUser = await authApi.me(token);
      setUser(currentUser);
      if (currentUser.is_pro) {
        setProActivationStatus((status) =>
          status === 'checking' || status === 'pending' ? 'confirmed' : status,
        );
      }
      return currentUser;
    } catch {
      return null;
    }
  }, [token]);

  const beginProActivationCheck = useCallback(() => {
    setProActivationStatus('checking');
  }, []);

  const clearProActivationStatus = useCallback(() => {
    setProActivationStatus('idle');
  }, []);

  const verifyProActivation = useCallback(async () => {
    if (!token || activationCheckInProgress.current) return;
    activationCheckInProgress.current = true;
    setProActivationStatus('checking');

    try {
      // Asaas confirms payments asynchronously. Poll for up to one minute after
      // returning from checkout, then let the user retry manually if needed.
      for (let attempt = 0; attempt < 15; attempt += 1) {
        const currentUser = await refreshUser();
        if (currentUser?.is_pro) {
          setProActivationStatus('confirmed');
          return;
        }
        if (attempt < 14) {
          await new Promise((resolve) => setTimeout(resolve, 4000));
        }
      }
      setProActivationStatus('pending');
    } finally {
      activationCheckInProgress.current = false;
    }
  }, [refreshUser, token]);

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !token) return;
      if (proActivationStatus === 'checking' || proActivationStatus === 'pending') {
        void verifyProActivation();
      } else {
        void refreshUser();
      }
    });
    return () => subscription.remove();
  }, [proActivationStatus, refreshUser, token, verifyProActivation]);

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
    setProActivationStatus('idle');
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
    setProActivationStatus('idle');
  }

  return (
    <AuthContext.Provider value={{
      isLoading,
      isGuest,
      token,
      user,
      proActivationStatus,
      refreshUser,
      beginProActivationCheck,
      verifyProActivation,
      clearProActivationStatus,
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
