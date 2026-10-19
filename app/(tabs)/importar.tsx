import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseCSVText, parseXLSXBase64, type ParsedRow } from '../../src/importAddresses/parse';
import { useStops } from '../../src/stops/StopsContext';
import { colors } from '../../src/theme/colors';

const MAX_STOPS = 50;

type FileType = 'csv' | 'xlsx';
type Step = 'select' | 'preview';

const TEMPLATE_CSV =
  '﻿endereco,descricao\r\n' +
  'Rua das Flores 123 São Paulo SP,Farmácia João\r\n' +
  'Av. Paulista 1000 São Paulo SP,""\r\n';

export default function Importar() {
  const { stops, addStops } = useStops();
  const [fileType, setFileType] = useState<FileType>('csv');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('select');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);

  function resetFile() {
    setFileName(null);
    setFileUri(null);
    setError('');
  }

  async function handlePickFile() {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type:
        fileType === 'csv'
          ? ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text']
          : [
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ],
    });
    if (result.canceled || !result.assets?.[0]) return;
    setFileName(result.assets[0].name);
    setFileUri(result.assets[0].uri);
  }

  async function handleImport() {
    if (!fileUri) return;
    setError('');
    try {
      const parsed =
        fileType === 'csv'
          ? parseCSVText(await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' }))
          : parseXLSXBase64(
              await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' }),
            );

      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      if (!parsed.rows.length) {
        setError('Nenhum endereço válido encontrado no arquivo.');
        return;
      }
      setRows(parsed.rows);
      setSkipped(parsed.skipped);
      setStep('preview');
    } catch {
      setError('Erro ao ler o arquivo. Tente novamente.');
    }
  }

  function handleApply(mode: 'add' | 'replace') {
    const total = mode === 'replace' ? rows.length : stops.length + rows.length;
    if (total > MAX_STOPS) {
      setError(`Limite de ${MAX_STOPS} paradas excedido (${total} no total). Reduza a quantidade.`);
      return;
    }
    addStops(rows, mode);
    setNotice(mode === 'replace' ? `Substituídas ${rows.length} paradas.` : `Adicionadas ${rows.length} paradas.`);
    setTimeout(() => setNotice(''), 3000);
    setStep('select');
    setRows([]);
    setSkipped(0);
    resetFile();
  }

  async function handleDownloadTemplate() {
    const uri = `${FileSystem.documentDirectory}template-enderecos.csv`;
    await FileSystem.writeAsStringAsync(uri, TEMPLATE_CSV, { encoding: 'utf8' });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'text/csv' });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Importar endereços</Text>

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {step === 'select' ? (
          <>
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeButton, fileType === 'csv' && styles.typeButtonActive]}
                onPress={() => {
                  setFileType('csv');
                  resetFile();
                }}
              >
                <Text
                  style={[styles.typeButtonText, fileType === 'csv' && styles.typeButtonTextActive]}
                >
                  CSV
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeButton, fileType === 'xlsx' && styles.typeButtonActive]}
                onPress={() => {
                  setFileType('xlsx');
                  resetFile();
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    fileType === 'xlsx' && styles.typeButtonTextActive,
                  ]}
                >
                  XLS
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.dropzone} onPress={handlePickFile}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
              {fileName ? (
                <View style={styles.selectedFileRow}>
                  <Ionicons name="document-text-outline" size={18} color={colors.text} />
                  <Text style={styles.selectedFileName}>{fileName}</Text>
                  <Pressable onPress={resetFile}>
                    <Ionicons name="close" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Text style={styles.dropzoneTitle}>Toque para selecionar um arquivo</Text>
                  <Text style={styles.dropzoneHint}>
                    Formato aceito: .{fileType === 'csv' ? 'csv' : 'xls, .xlsx'}
                  </Text>
                </>
              )}
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.templateButton} onPress={handleDownloadTemplate}>
              <Ionicons name="download-outline" size={14} color={colors.accent} />
              <Text style={styles.templateButtonText}>Baixar template CSV</Text>
            </Pressable>

            <Pressable
              style={[styles.importButton, !fileUri && styles.buttonDisabled]}
              disabled={!fileUri}
              onPress={handleImport}
            >
              <Text style={styles.importButtonText}>Importar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.statRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={styles.statText}>
                <Text style={styles.statBold}>{rows.length}</Text> endereços encontrados
              </Text>
            </View>
            {skipped > 0 ? (
              <View style={styles.statRow}>
                <Ionicons name="warning-outline" size={18} color={colors.dangerMuted} />
                <Text style={styles.statText}>
                  <Text style={styles.statBold}>{skipped}</Text> linhas ignoradas (sem endereço)
                </Text>
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.actionLabel}>O que deseja fazer?</Text>
            <Pressable style={styles.importButton} onPress={() => handleApply('add')}>
              <Text style={styles.importButtonText}>Adicionar às paradas atuais</Text>
            </Pressable>
            <Pressable style={styles.replaceButton} onPress={() => handleApply('replace')}>
              <Text style={styles.importButtonText}>Substituir lista atual</Text>
            </Pressable>
            <Pressable style={styles.backButton} onPress={() => setStep('select')}>
              <Text style={styles.backButtonText}>← Voltar</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  notice: {
    color: colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  typeButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: colors.onAccent,
  },
  dropzone: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  dropzoneTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  dropzoneHint: {
    color: colors.textMuted,
    fontSize: 12,
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedFileName: {
    color: colors.text,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  templateButtonText: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
  importButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: colors.onAccent,
    fontWeight: '600',
    fontSize: 16,
  },
  replaceButton: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  backButton: {
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  statText: {
    color: colors.text,
  },
  statBold: {
    fontWeight: '700',
  },
  actionLabel: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
