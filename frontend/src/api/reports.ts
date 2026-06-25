/**
 * Reports-API-Modul.
 *
 * Da der allgemeine apiFetch-Client JSON erwartet, brauchen wir für
 * Datei-Downloads einen eigenen Fetch-Wrapper der einen Blob zurückgibt
 * und den Browser-Download auslöst.
 */

import { getToken, ApiError } from './client.js';

export type ReportFormat = 'csv' | 'pdf';

interface DownloadParams {
  memberId: number;
  year: number;
  month: number;
  format: ReportFormat;
}

interface DownloadAllParams {
  year: number;
  month: number;
}

// ---------------------------------------------------------------------------
// Interner Download-Helfer
// ---------------------------------------------------------------------------

async function downloadBlob(url: string): Promise<{ blob: Blob; filename: string }> {
  const token = getToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, { headers });

  if (!response.ok) {
    let message = 'Download fehlgeschlagen';
    try {
      const json = (await response.json()) as { error?: string };
      message = json.error ?? message;
    } catch {
      // Body nicht JSON → Fallback-Meldung
    }
    throw new ApiError(response.status, message);
  }

  const blob = await response.blob();

  // Dateiname aus Content-Disposition extrahieren
  const disposition = response.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = match?.[1] ?? 'export';

  return { blob, filename };
}

/** Löst im Browser einen Datei-Download aus (kein neues Tab). */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Kurz warten bevor URL freigegeben wird
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------

/**
 * Lädt den Monatsbericht eines Mitglieds herunter.
 * Wirft ApiError bei HTTP-Fehlern.
 */
export async function downloadMonthlyReport({
  memberId,
  year,
  month,
  format,
}: DownloadParams): Promise<void> {
  const qs = new URLSearchParams({
    memberId: String(memberId),
    year: String(year),
    month: String(month),
    format,
  });
  const { blob, filename } = await downloadBlob(`/api/v1/reports/monthly?${qs}`);
  triggerDownload(blob, filename);
}

/**
 * Lädt das Sammel-PDF aller aktiven Mitglieder herunter.
 * Wirft ApiError bei HTTP-Fehlern.
 */
export async function downloadAllMembersReport({ year, month }: DownloadAllParams): Promise<void> {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
    format: 'pdf',
  });
  const { blob, filename } = await downloadBlob(`/api/v1/reports/all?${qs}`);
  triggerDownload(blob, filename);
}

/** Zeiger-Detailbericht (einzelner Zeiger). */
export async function downloadZeigerReport(zeigerId: number, format: ReportFormat): Promise<void> {
  const qs = new URLSearchParams({ format });
  const { blob, filename } = await downloadBlob(`/api/v1/reports/zeiger/${zeigerId}?${qs}`);
  triggerDownload(blob, filename);
}

/** Zeiger-Übersicht (alle Zeiger, optionaler Zeitraum). */
export async function downloadAllZeigerReport(
  format: ReportFormat,
  from?: string,
  to?: string,
): Promise<void> {
  const params = new URLSearchParams({ format });
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { blob, filename } = await downloadBlob(`/api/v1/reports/zeiger?${params}`);
  triggerDownload(blob, filename);
}
