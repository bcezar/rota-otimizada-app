import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { formatRouteText } from '../src/stops/formatRoute';
import { useStops } from '../src/stops/StopsContext';

export default function Result() {
  const { lastResult } = useStops();
  const [copied, setCopied] = useState(false);

  if (!lastResult) {
    return (
      <View style={styles.container}>
        <Text>Nenhum resultado disponível.</Text>
      </View>
    );
  }

  async function handleOpenMaps() {
    if (lastResult!.maps_url) {
      await Linking.openURL(lastResult!.maps_url);
    }
  }

  async function handleShare() {
    try {
      await Share.share({ message: formatRouteText(lastResult!) });
    } catch {
      // usuário cancelou o share sheet — não é um erro a reportar
    }
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(formatRouteText(lastResult!));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rota otimizada</Text>
      <Text style={styles.subtitle}>
        {lastResult.total_distance_km.toFixed(1)} km
        {lastResult.total_duration_min != null
          ? ` · ${Math.round(lastResult.total_duration_min)} min`
          : ''}
      </Text>
      <FlatList
        data={lastResult.optimized_route}
        keyExtractor={(stop) => String(stop.order)}
        renderItem={({ item }) => (
          <View style={styles.stopRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.order}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text>{item.original_address}</Text>
              {item.leg_distance_km != null ? (
                <Text style={styles.legText}>{item.leg_distance_km.toFixed(1)} km até a próxima</Text>
              ) : null}
            </View>
          </View>
        )}
      />

      {copied ? <Text style={styles.copiedText}>Copiado!</Text> : null}

      <View style={styles.actionsRow}>
        {lastResult.maps_url ? (
          <Pressable style={[styles.actionButton, styles.actionButtonThird]} onPress={handleOpenMaps}>
            <Text style={styles.actionButtonText}>Google Maps</Text>
          </Pressable>
        ) : null}
        <Pressable style={[styles.actionButton, styles.actionButtonThird]} onPress={handleShare}>
          <Text style={styles.actionButtonText}>Compartilhar</Text>
        </Pressable>
        <Pressable style={[styles.actionButton, styles.actionButtonThird]} onPress={handleCopy}>
          <Text style={styles.actionButtonText}>Copiar</Text>
        </Pressable>
      </View>

      <Pressable style={styles.button} onPress={() => router.replace('/home')}>
        <Text style={styles.buttonText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 12,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  stopInfo: {
    flex: 1,
  },
  legText: {
    color: '#6b7280',
    fontSize: 12,
  },
  copiedText: {
    color: '#1a7f3c',
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonThird: {
    flex: 1,
  },
  actionButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
