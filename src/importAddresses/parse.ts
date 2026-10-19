import { read, utils } from 'xlsx';

export interface ParsedRow {
  address: string;
  description: string;
}

export type ParseResult =
  | { ok: true; rows: ParsedRow[]; skipped: number }
  | { ok: false; error: string };

const ADDRESS_HEADER_NAMES = ['endereco', 'address'];
const DESCRIPTION_HEADER_NAMES = ['descricao', 'description'];

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/\s+/g, '');
}

function findIndex(headers: string[], names: string[]): number {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

function parseCsvRow(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuote) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuote = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCSVText(text: string): ParseResult {
  const clean = text.replace(/^﻿/, '');
  const lines = clean.split(/\r?\n/);
  if (!lines.length || !lines[0].trim()) {
    return { ok: false, error: 'Arquivo vazio.' };
  }

  const first = lines[0];
  const semiCount = (first.match(/;/g) || []).length;
  const commaCount = (first.match(/,/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const headers = parseCsvRow(lines[0], delimiter).map(normalizeHeader);
  const addressIdx = findIndex(headers, ADDRESS_HEADER_NAMES);
  const descriptionIdx = findIndex(headers, DESCRIPTION_HEADER_NAMES);

  if (addressIdx === -1) {
    return { ok: false, error: "Coluna 'endereco' não encontrada. Verifique o arquivo." };
  }

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCsvRow(lines[i], delimiter);
    const address = (fields[addressIdx] ?? '').trim();
    if (!address) {
      skipped++;
      continue;
    }
    rows.push({
      address,
      description: descriptionIdx >= 0 ? (fields[descriptionIdx] ?? '').trim() : '',
    });
  }
  return { ok: true, rows, skipped };
}

export function parseXLSXBase64(base64: string): ParseResult {
  const workbook = read(base64, { type: 'base64' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw: Record<string, string>[] = utils.sheet_to_json(sheet, { raw: false, defval: '' });
  if (!raw.length) {
    return { ok: false, error: 'Arquivo vazio.' };
  }

  const firstRowKeys = Object.keys(raw[0]);
  const addressKey = firstRowKeys.find((key) =>
    ADDRESS_HEADER_NAMES.includes(normalizeHeader(key)),
  );
  const descriptionKey = firstRowKeys.find((key) =>
    DESCRIPTION_HEADER_NAMES.includes(normalizeHeader(key)),
  );

  if (!addressKey) {
    return { ok: false, error: "Coluna 'endereco' não encontrada. Verifique o arquivo." };
  }

  const rows: ParsedRow[] = [];
  let skipped = 0;
  for (const obj of raw) {
    const address = (obj[addressKey] ?? '').trim();
    if (!address) {
      skipped++;
      continue;
    }
    rows.push({
      address,
      description: descriptionKey ? (obj[descriptionKey] ?? '').trim() : '',
    });
  }
  return { ok: true, rows, skipped };
}
