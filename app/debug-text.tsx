import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type TextLayoutEvent,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../src/theme/colors';

type ProbeMetrics = {
  parentWidth?: number;
  textWidth?: number;
  lineWidth?: number;
  lineCount?: number;
  lineHeight?: number;
  ascender?: number;
  descender?: number;
};

type ProbeProps = {
  label: string;
  text: string;
  containerStyle?: ViewStyle;
  weight?: TextStyle['fontWeight'];
  parentStyle?: ViewStyle;
  textStyle?: TextStyle;
  allowFontScaling?: boolean;
  fontFamily?: string;
};

function round(value?: number) {
  return value === undefined ? '—' : `${value.toFixed(1)} dp`;
}

function TextProbe({
  label,
  text,
  containerStyle,
  weight,
  parentStyle,
  textStyle,
  allowFontScaling = true,
  fontFamily,
}: ProbeProps) {
  const [metrics, setMetrics] = useState<ProbeMetrics>({});

  function updateMetrics(next: Partial<ProbeMetrics>) {
    setMetrics((current) => {
      const updated = { ...current, ...next };
      if (
        updated.parentWidth === current.parentWidth &&
        updated.textWidth === current.textWidth &&
        updated.lineWidth === current.lineWidth &&
        updated.lineCount === current.lineCount &&
        updated.lineHeight === current.lineHeight &&
        updated.ascender === current.ascender &&
        updated.descender === current.descender
      ) {
        return current;
      }
      return updated;
    });
  }

  function onParentLayout(event: LayoutChangeEvent) {
    updateMetrics({ parentWidth: event.nativeEvent.layout.width });
  }

  function onTextLayout(event: TextLayoutEvent) {
    const lines = event.nativeEvent.lines;
    updateMetrics({
      lineWidth: lines[0]?.width,
      lineCount: lines.length,
      lineHeight: lines[0]?.height,
      ascender: lines[0]?.ascender,
      descender: lines[0]?.descender,
    });
  }

  return (
    <View style={[styles.probe, containerStyle]}>
      <Text style={styles.probeLabel}>
        {label} · peso {weight ?? 'padrão'} · fonte {fontFamily ?? 'padrão'} · escala {allowFontScaling ? 'on' : 'off'}
      </Text>
      <View style={[styles.probeBox, parentStyle]} onLayout={onParentLayout}>
        <Text
          allowFontScaling={allowFontScaling}
          onLayout={(event) => updateMetrics({ textWidth: event.nativeEvent.layout.width })}
          onTextLayout={onTextLayout}
          style={[
            styles.sampleText,
            weight ? { fontWeight: weight } : undefined,
            fontFamily ? { fontFamily } : undefined,
            textStyle,
          ]}
        >
          {text}
        </Text>
      </View>
      <Text style={styles.metrics}>
        Pai: {round(metrics.parentWidth)} · Texto: {round(metrics.textWidth)} · Linha: {round(metrics.lineWidth)} · Linhas: {metrics.lineCount ?? '—'}
      </Text>
      <Text style={styles.metrics}>
        Altura: {round(metrics.lineHeight)} · Asc: {round(metrics.ascender)} · Desc: {round(metrics.descender)}
      </Text>
      <Text style={styles.expected}>Esperado: “{text}”</Text>
    </View>
  );
}

export default function DebugTextScreen() {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();

  if (!__DEV__) return null;

  const suspiciousLabels = [
    'Pro',
    'Waze',
    'Carro',
    'Motocicleta',
    'Bicicleta',
    'Navegar',
    'Concluir',
    'Conta',
    'Enviar link de acesso',
    'Continuar sem conta',
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backLabel}>‹ Voltar</Text>
        </Pressable>
        <Text style={styles.title}>Diagnóstico de texto</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Compare o texto visível com as medidas abaixo. Fotografe esta tela se alguma letra desaparecer.
        </Text>
        <Text style={styles.deviceInfo}>
          Android/API: {Platform.Version} · Tela: {width.toFixed(1)} × {height.toFixed(1)} dp · Pixel ratio: {PixelRatio.get().toFixed(2)} · Font scale: {fontScale.toFixed(2)}
        </Text>

        <Text style={styles.sectionTitle}>1. Texto natural, sem largura fixa</Text>
        {suspiciousLabels.map((text) => (
          <TextProbe
            key={`natural-${text}`}
            label="Natural"
            text={text}
            weight="600"
            parentStyle={styles.naturalParent}
          />
        ))}

        <Text style={styles.sectionTitle}>2. Largura natural de chip</Text>
        {suspiciousLabels.map((text) => (
          <TextProbe
            key={`chip-${text}`}
            label="Chip"
            text={text}
            weight="600"
            parentStyle={styles.chipParent}
            textStyle={styles.chipText}
          />
        ))}

        <Text style={styles.sectionTitle}>3. Comparação de peso e escala</Text>
        {(['Motocicleta', 'Waze', 'Pro'] as const).flatMap((text) =>
          (['400', '600', '700'] as const).flatMap((weight) => [
            <TextProbe
              key={`${text}-${weight}-scale-on`}
              label="Natural"
              text={text}
              weight={weight}
              parentStyle={styles.naturalParent}
            />,
            <TextProbe
              key={`${text}-${weight}-scale-off`}
              label="Natural"
              text={text}
              weight={weight}
              parentStyle={styles.naturalParent}
              allowFontScaling={false}
            />,
          ]),
        )}

        <Text style={styles.sectionTitle}>4. Layout parecido com a aba inferior</Text>
        <View style={styles.tabsRow}>
          {['Navegação', 'Endereços', 'Otimizar', 'Importar', 'Conta'].map((text) => (
            <TextProbe
              key={`tab-${text}`}
              label="Item flexível"
              text={text}
              weight="600"
              containerStyle={styles.tabProbe}
              parentStyle={styles.tabParent}
              textStyle={styles.tabText}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>5. Teste de medição após fonte de ícone</Text>
        <Text style={styles.note}>
          Compare os valores de altura, ascendente e descendente antes e depois do ícone. Os textos são diferentes de propósito.
        </Text>
        <TextProbe
          label="Antes do ícone · controle"
          text="BaselineText"
          parentStyle={styles.naturalParent}
          textStyle={styles.nativeProbeText}
        />
        <View style={styles.iconTrigger}>
          <Ionicons name="home" size={28} color={colors.accent} />
          <Text style={styles.iconTriggerLabel}>Fonte de ícone Ionicons carregada</Text>
        </View>
        <TextProbe
          label="Depois do ícone · texto simples"
          text="AndroidProbe"
          parentStyle={styles.naturalParent}
          textStyle={styles.nativeProbeText}
        />
        <TextProbe
          label="Depois do ícone · segundo texto simples"
          text="ReactNativeProbe"
          parentStyle={styles.naturalParent}
          textStyle={styles.nativeProbeText}
        />
        <TextProbe
          label="Fonte casual · comparação explícita"
          text="Dazzle"
          parentStyle={styles.naturalParent}
          fontFamily="casual"
          textStyle={styles.nativeProbeText}
        />

        <Text style={styles.sectionTitle}>6. Texto natural versus caixa larga</Text>
        <Text style={styles.note}>
          O texto é o mesmo nos dois casos. Veja se a última letra aparece quando o próprio componente Text recebe uma caixa mais larga.
        </Text>
        <TextProbe
          label="Largura natural"
          text="AndroidProbe"
          parentStyle={styles.naturalParent}
          textStyle={styles.nativeProbeText}
        />
        <TextProbe
          label="Caixa larga · 260 dp"
          text="AndroidProbe"
          parentStyle={styles.wideParent}
          textStyle={styles.wideText}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    minWidth: 76,
    paddingVertical: 8,
  },
  backLabel: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  note: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  deviceInfo: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  probe: {
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    gap: 4,
  },
  probeLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  probeBox: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.background,
  },
  naturalParent: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  chipParent: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  chipText: {
    fontSize: 13,
  },
  sampleText: {
    color: colors.text,
    fontSize: 16,
  },
  metrics: {
    color: colors.textMuted,
    fontSize: 10,
  },
  expected: {
    color: colors.accent,
    fontSize: 12,
  },
  iconTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  iconTriggerLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  nativeProbeText: {
    fontSize: 24,
  },
  wideParent: {
    alignSelf: 'flex-start',
    width: 260,
    alignItems: 'stretch',
  },
  wideText: {
    width: '100%',
    fontSize: 24,
  },
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabProbe: {
    flex: 1,
    minWidth: 0,
    padding: 2,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  tabParent: {
    minHeight: 54,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tabText: {
    fontSize: 11,
  },
});
