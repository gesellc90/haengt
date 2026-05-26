/**
 * Admin-Seite: Monats-Abrechnung
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
  return Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).reverse();
}

const MONTHS: { value: number; label: string }[] = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleString('de-DE', { month: 'long' }),
}));

// ---------------------------------------------------------------------------
// Gemeinsame Styles
// ---------------------------------------------------------------------------

const selectStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '8px 12px',
  borderRadius: 'var(--r-2)',
  border: '1px solid var(--line-2)',
  background: 'var(--bg)',
  color: 'var(--tinte)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--tinte-3)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 5,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 'var(--r-3)',
  border: '1px solid var(--line)',
  background: 'var(--bg-card)',
  padding: 24,
  boxShadow: 'var(--sh-1)',
};

// ---------------------------------------------------------------------------
// Download-Button
// ---------------------------------------------------------------------------

interface DownloadButtonProps {
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

function DownloadButton({
  label,
  loading,
  disabled,
  onClick,
  variant = 'primary',
}: DownloadButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '10px 20px',
        borderRadius: 'var(--r-2)',
        border: isPrimary ? 'none' : '1px solid var(--line-2)',
        background: isPrimary ? 'var(--korps-rot)' : 'transparent',
        color: isPrimary ? 'var(--kreide)' : 'var(--tinte-2)',
        fontFamily: 'var(--font-sans)',
        fontSize: 14,
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'opacity 120ms',
        letterSpacing: '0.03em',
      }}
    >
      {loading ? (
        <svg
          style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
            strokeOpacity="0.25"
          />
          <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : null}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Abschnitts-Titel
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--tinte)',
        letterSpacing: '0.04em',
        margin: '0 0 16px',
        paddingBottom: 8,
        borderBottom: '2px solid var(--korps-rot)',
        display: 'inline-block',
      }}
    >
      {children}
    </h2>
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

  const noMember = selectedMemberId === null;
  const busy = loadingCsv || loadingPdf || loadingAll;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Auswahl-Panel */}
      <div style={cardStyle}>
        <SectionTitle>Zeitraum &amp; Mitglied</SectionTitle>

        <div className="grid gap-4 sm:grid-cols-3" style={{ marginBottom: 24 }}>
          <div>
            <label htmlFor="report-month" style={labelStyle}>
              Monat
            </label>
            <select
              id="report-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={selectStyle}
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-year" style={labelStyle}>
              Jahr
            </label>
            <select
              id="report-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={selectStyle}
            >
              {yearRange().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-member" style={labelStyle}>
              Mitglied
            </label>
            {membersLoading ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 44,
                }}
              >
                <svg
                  style={{
                    width: 16,
                    height: 16,
                    animation: 'spin 0.8s linear infinite',
                    color: 'var(--korps-rot)',
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeOpacity="0.25"
                  />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : (
              <select
                id="report-member"
                value={selectedMemberId ?? ''}
                onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                style={selectStyle}
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

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <DownloadButton
            label="CSV herunterladen"
            loading={loadingCsv}
            disabled={noMember || busy}
            onClick={() => void handleDownload('csv')}
            variant="secondary"
          />
          <DownloadButton
            label="PDF herunterladen"
            loading={loadingPdf}
            disabled={noMember || busy}
            onClick={() => void handleDownload('pdf')}
          />
        </div>
      </div>

      {/* Sammel-Export */}
      <div style={cardStyle}>
        <SectionTitle>Sammel-Export</SectionTitle>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--tinte-3)',
            marginBottom: 20,
            marginTop: -8,
          }}
        >
          PDF mit allen aktiven Mitgliedern und Inhaltsverzeichnis für den gewählten Monat.
        </p>
        <DownloadButton
          label="Alle Mitglieder (PDF)"
          loading={loadingAll}
          disabled={busy}
          onClick={() => void handleDownloadAll()}
        />
      </div>
    </div>
  );
}
