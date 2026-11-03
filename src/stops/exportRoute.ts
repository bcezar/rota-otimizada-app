import type { RouteResponse, RouteStop } from '../api/types';
import type { RouteStopStatus, Stop } from './StopsContext';
import { mapRouteStopsToLocalStops } from './routeStopMapping';

export interface RouteExportRow {
  order: string;
  type: string;
  address: string;
  placeName: string;
  notes: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  tags: string;
  status: string;
}

function getRows(
  routeStops: RouteStop[],
  stops: Stop[],
  statuses: Record<number, RouteStopStatus>,
): RouteExportRow[] {
  const idsByOrder = mapRouteStopsToLocalStops(routeStops, stops);
  return routeStops
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((routeStop) => {
      const localStop = stops.find((stop) => stop.id === idsByOrder[routeStop.order]);
      const client = localStop?.client;
      const status = statuses[routeStop.order];
      return {
        order: String(routeStop.order),
        type: 'Parada',
        address: routeStop.original_address,
        placeName: localStop?.placeName ?? '',
        notes: localStop?.description ?? '',
        clientName: client?.name ?? '',
        clientEmail: client?.email ?? '',
        clientPhone: client?.phone ?? '',
        tags: localStop?.tags.join('; ') ?? '',
        status: status === 'visited' ? 'Visitada' : status === 'failed' ? 'Falhada' : 'Pendente',
      };
    });
}

export function buildRouteCsv(
  result: RouteResponse,
  stops: Stop[],
  statuses: Record<number, RouteStopStatus>,
) {
  const header = [
    'Ordem', 'Tipo', 'Endereço', 'Nome do local', 'Observações', 'Cliente',
    'E-mail do cliente', 'Telefone do cliente', 'Tags', 'Status',
  ];
  const rows: string[][] = [];
  if (result.origin) rows.push(['0', 'Origem', result.origin.address, '', '', '', '', '', '', '']);
  rows.push(...getRows(result.optimized_route, stops, statuses).map((row) => [
    row.order, row.type, row.address, row.placeName, row.notes,
    row.clientName, row.clientEmail, row.clientPhone, row.tags, row.status,
  ]));
  if (result.destination) rows.push(['F', 'Destino', result.destination.address, '', '', '', '', '', '', '']);
  const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return `\uFEFF${header.map(quote).join(',')}\r\n${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildRoutePdfHtml(
  result: RouteResponse,
  stops: Stop[],
  statuses: Record<number, RouteStopStatus>,
) {
  const rows = getRows(result.optimized_route, stops, statuses);
  const endpoint = (order: string, type: string, address: string) => `
    <tr><td>${order}</td><td><strong>${type}</strong><br>${escapeHtml(address)}</td>
    <td colspan="6">—</td></tr>`;
  const stopRows = rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.order)}</td>
      <td><strong>${escapeHtml(row.placeName || row.address)}</strong>${row.placeName ? `<br>${escapeHtml(row.address)}` : ''}</td>
      <td>${escapeHtml(row.notes) || '—'}</td>
      <td>${escapeHtml(row.clientName) || '—'}</td>
      <td>${escapeHtml(row.clientEmail) || '—'}</td>
      <td>${escapeHtml(row.clientPhone) || '—'}</td>
      <td>${escapeHtml(row.tags) || '—'}</td>
      <td>${escapeHtml(row.status)}</td>
    </tr>`).join('');
  const duration = result.total_duration_min == null ? '' : ` · ${Math.round(result.total_duration_min)} min`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      @page { size: A4 landscape; margin: 16mm 12mm; }
      body { font-family: Arial, sans-serif; color: #172033; font-size: 10px; }
      h1 { margin: 0 0 5px; color: #1456dc; font-size: 22px; }
      .summary { margin: 0 0 16px; color: #52627a; font-size: 12px; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; }
      th { background: #eaf0fb; text-align: left; }
      th, td { border: 1px solid #d5deed; padding: 7px 6px; vertical-align: top; overflow-wrap: anywhere; }
      tr { page-break-inside: avoid; }
      th:first-child, td:first-child { width: 35px; text-align: center; }
      footer { margin-top: 14px; color: #718096; }
    </style></head><body>
      <h1>Rota otimizada</h1>
      <p class="summary">${rows.length} ${rows.length === 1 ? 'parada' : 'paradas'} · ${result.total_distance_km.toFixed(1)} km${duration}</p>
      <table><thead><tr><th>Ordem</th><th>Endereço / local</th><th>Observações</th><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Tags</th><th>Status</th></tr></thead>
      <tbody>${result.origin ? endpoint('0', 'Origem', result.origin.address) : ''}${stopRows}${result.destination ? endpoint('F', 'Destino', result.destination.address) : ''}</tbody></table>
      <footer>Exportado pelo Rota Otimizada</footer>
    </body></html>`;
}
