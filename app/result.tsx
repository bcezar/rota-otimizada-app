import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { formatRouteText } from '../src/stops/formatRoute';
import { useStops } from '../src/stops/StopsContext';
import { colors } from '../src/theme/colors';

export default function Result() {
  const { stops, lastResult } = useStops();
  const [copied, setCopied] = useState(false);
  const [visited, setVisited] = useState<Record<number, boolean>>({});
  const [skipped, setSkipped] = useState<Record<number, boolean>>({});

  if (!lastResult) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Nenhum resultado disponível.</Text>
      </View>
    );
  }

  function toggleVisited(order: number) {
    setVisited((prev) => {
      const next = { ...prev };
      if (next[order]) {
        delete next[order];
      } else {
        next[order] = true;
      }
      return next;
    });
    setSkipped((prev) => {
      if (!prev[order]) return prev;
      const next = { ...prev };
      delete next[order];
      return next;
    });
  }

  function toggleSkipped(order: number) {
    setSkipped((prev) => {
      const next = { ...prev };
      if (next[order]) {
        delete next[order];
      } else {
        next[order] = true;
      }
      return next;
    });
    setVisited((prev) => {
      if (!prev[order]) return prev;
      const next = { ...prev };
      delete next[order];
      return next;
    });
  }

  async function handleOpenMaps() {
    if (lastResult!.maps_url) {
      await Linking.openURL(lastResult!.maps_url);
    }
  }

  async function handleShare() {
    try {
      await Share.share({ message: formatRouteText(lastResult!, stops) });
    } catch {
      // usuário cancelou o share sheet — não é um erro a reportar
    }
  }

  async function handleCopy() {
    await Clipboard.setStringAsync(formatRouteText(lastResult!, stops));
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
        ListHeaderComponent={
          lastResult.origin ? (
            <View style={styles.stopRow}>
              <View style={[styles.badge, styles.badgeFixed]}>
                <Text style={styles.badgeText}>0</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopAddressText}>{lastResult.origin.address}</Text>
                <Text style={styles.legText}>Origem</Text>
              </View>
            </View>
          ) : null
        }
        ListFooterComponent={
          lastResult.destination ? (
            <View style={styles.stopRow}>
              <View style={[styles.badge, styles.badgeFixed]}>
                <Text style={styles.badgeText}>F</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={styles.stopAddressText}>{lastResult.destination.address}</Text>
                <Text style={styles.legText}>Destino</Text>
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isVisited = !!visited[item.order];
          const isSkipped = !!skipped[item.order];
          const description = stops.find((s) => s.address === item.original_address)?.description;
          return (
            <View style={[styles.stopRow, isSkipped && styles.stopRowSkipped]}>
              <View style={[styles.badge, isVisited && styles.badgeVisited]}>
                <Text style={styles.badgeText}>{item.order}</Text>
              </View>
              <View style={styles.stopInfo}>
                <Text style={[styles.stopAddressText, isSkipped && styles.strikethrough]}>
                  {description ? `${description} — ` : ''}
                  {item.original_address}
                </Text>
                {item.leg_distance_km != null ? (
                  <Text style={styles.legText}>{item.leg_distance_km.toFixed(1)} km até a próxima</Text>
                ) : null}
              </View>
              <Pressable onPress={() => toggleVisited(item.order)}>
                <Text style={[styles.stopActionText, isVisited && styles.stopActionActiveVisited]}>
                  {isVisited ? '✓ Visitada' : 'Visitar'}
                </Text>
              </Pressable>
              <Pressable onPress={() => toggleSkipped(item.order)}>
                <Text style={[styles.stopActionText, isSkipped && styles.stopActionActiveSkipped]}>
                  {isSkipped ? 'Pulada' : 'Pular'}
                </Text>
              </Pressable>
            </View>
          );
        }}
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
    backgroundColor: colors.background,
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  emptyText: {
    color: colors.textMuted,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stopRowSkipped: {
    opacity: 0.5,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeVisited: {
    backgroundColor: colors.success,
  },
  badgeFixed: {
    backgroundColor: colors.textMuted,
  },
  badgeText: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 12,
  },
  stopInfo: {
    flex: 1,
  },
  stopAddressText: {
    color: colors.text,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  legText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stopActionText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  stopActionActiveVisited: {
    color: colors.success,
  },
  stopActionActiveSkipped: {
    color: colors.danger,
  },
  copiedText: {
    color: colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonThird: {
    flex: 1,
  },
  actionButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  button: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
});
