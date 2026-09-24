import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '../src/api/client';
import * as routesApi from '../src/api/routes';
import type { StopLimitExceededDetail } from '../src/api/types';
import { useAuth } from '../src/auth/AuthContext';
import { useStops } from '../src/stops/StopsContext';

export default function Home() {
  const { user, token, logout } = useAuth();
  const { stops, removeStop, setLastResult } = useStops();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  async function handleOptimize() {
    setError('');
    setIsOptimizing(true);
    try {
      const result = await routesApi.optimizeRoute(
        stops.map((stop) => stop.address),
        token,
      );
      setLastResult(result);
      router.push('/result');
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        const detail = e.detail as StopLimitExceededDetail;
        setError(`Limite de ${detail.limit} paradas atingido para o seu plano.`);
      } else {
        setError(e instanceof ApiError ? e.message : 'Não foi possível otimizar a rota.');
      }
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Olá, {user?.email}</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair</Text>
        </Pressable>
      </View>

      <FlatList
        style={styles.list}
        data={stops}
        keyExtractor={(stop) => stop.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Adicione ao menos 2 paradas para otimizar.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.stopRow}>
            <Text style={styles.stopAddress}>{item.address}</Text>
            <Pressable onPress={() => removeStop(item.id)}>
              <Text style={styles.removeText}>Remover</Text>
            </Pressable>
          </View>
        )}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.addButton} onPress={() => router.push('/add-stop')}>
        <Text style={styles.addButtonText}>+ Adicionar parada</Text>
      </Pressable>

      <Pressable
        style={[styles.optimizeButton, stops.length < 2 && styles.buttonDisabled]}
        disabled={stops.length < 2 || isOptimizing}
        onPress={handleOptimize}
      >
        {isOptimizing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.optimizeButtonText}>Otimizar rota</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  logoutText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 24,
  },
  stopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stopAddress: {
    flex: 1,
    marginRight: 12,
  },
  removeText: {
    color: '#dc2626',
  },
  error: {
    color: '#dc2626',
  },
  addButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  optimizeButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  optimizeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
