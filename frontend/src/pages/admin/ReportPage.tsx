/**
 * Admin-Seite: Monats-Reporting
 *
 * Ermöglicht:
 *  - Monat + Jahr auswählen
 *  - Mitglied auswählen (oder alle)
 *  - Export als CSV oder PDF herunterladen
 */

import { useState, useEffect, useCallback } from 'react';
import { membersApi } from '../../api/members.js';
import {
  downloadMonthlyReport,
  downloadAllMembersReport,
  type ReportFormat,
} from '../../api/reports.js';
import { useToast } from '../../contexts/ToastContext.js';
import type { PublicMember } from '../../types/api.js';

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function yearRange(): number[] {
  const currentYear = new Date().getFullYear();
  // Letzten 3 Jahre + aktuelles Jahr
  return Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).reverse();
}

const MONTHS: { value: number; label: string }[] = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString('de-DE', { month: 'long' }),
}));

// ---------------------------------------------------------------------------
// Unterkomponente: Format-Button
// ---------------------------------------------------------------------------

interface FormatButtonProps {
  label: string;
  icon: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function FormatButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
  variant = 'primary',
}: FormatButtonProps) {
  const base =
    'min-h-[44px] inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-40 disabled:cursor-not-allowed';
  const colors =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600';

  return (
    <button onClick={onClick} disabled={disabled || loading} className={`${base} ${colors}`}>
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : (
        <span>{icon}</span>
      )}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------

export default function ReportPage() {
  const { showToast } = useToast();

  const { year: initYear, month: initMonth } = currentYearMonth();
  const [year, setYear] = useState(initYear);
  const [month, setMonth] = useState(initMonth);

  const [members, setMembers] = useState<PublicMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const [loadingCsv, setLoadingCsv] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

  // -- Mitglieder laden -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setMembersLoading(true);
    membersApi
      .getAll(false)
      .then((list) => {
        if (!cancelled) {
          setMembers(list);
          if (list.length > 0) setSelectedMemberId(list[0]!.id);
        }
      })
      .catch(() => {
        if (!cancelled) showToast('Mitgliederliste konnte nicht geladen werden.', 'error');
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  // -- Download-Handler -------------------------------------------------------

  const handleDownload = useCallback(
    async (format: ReportFormat) => {
      if (selectedMemberId === null) return;
      const setter = format === 'csv' ? setLoadingCsv : setLoadingPdf;
      setter(true);
      try {
        await downloadMonthlyReport({ memberId: selectedMemberId, year, month, format });
        showToast('Download gestartet.', 'success');
      } catch {
        showToast('Download fehlgeschlagen. Bitte erneut versuchen.', 'error');
      } finally {
        setter(false);
      }
    },
    [selectedMemberId, year, month, showToast],
  );

  const handleDownloadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      await downloadAllMembersReport({ year, month });
      showToast('Sammel-Download gestartet.', 'success');
    } catch {
      showToast('Download fehlgeschlagen. Bitte erneut versuchen.', 'error');
    } finally {
      setLoadingAll(false);
    }
  }, [year, month, showToast]);

  // -- Render -----------------------------------------------------------------

  const noMember = selectedMemberId === null;
  const busy = loadingCsv || loadingPdf || loadingAll;

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Monats-Report</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Abrechnungen als PDF oder CSV herunterladen.
        </p>
      </div>

      {/* Auswahl-Panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 text-base font-semibold text-slate-700 dark:text-slate-200">
          Zeitraum &amp; Mitglied
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Monat */}
          <div>
            <label
              htmlFor="report-month"
              className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Monat
            </label>
            <select
              id="report-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Jahr */}
          <div>
            <label
              htmlFor="report-year"
              className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Jahr
            </label>
            <select
              id="report-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              {yearRange().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Mitglied */}
          <div>
            <label
              htmlFor="report-member"
              className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
            >
              Mitglied
            </label>
            {membersLoading ? (
              <div className="flex h-10 items-center">
                <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : (
              <select
                id="report-member"
                value={selectedMemberId ?? ''}
                onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Download-Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <FormatButton
            label="CSV herunterladen"
            icon="📄"
            loading={loadingCsv}
            disabled={noMember || busy}
            onClick={() => handleDownload('csv')}
            variant="secondary"
          />
          <FormatButton
            label="PDF herunterladen"
            icon="📑"
            loading={loadingPdf}
            disabled={noMember || busy}
            onClick={() => handleDownload('pdf')}
          />
        </div>
      </div>

      {/* Sammel-Export */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-1 text-base font-semibold text-slate-700 dark:text-slate-200">
          Sammel-Export
        </h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          PDF mit allen aktiven Mitgliedern und Inhaltsverzeichnis für den gewählten Monat.
        </p>
        <FormatButton
          label="Alle Mitglieder (PDF)"
          icon="📦"
          loading={loadingAll}
          disabled={busy}
          onClick={handleDownloadAll}
        />
      </div>
    </div>
  );
}
