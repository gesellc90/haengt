import { useState } from 'react';
import Spinner from './Spinner.js';

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

interface SortenButtonProps {
  /** Getränkename, z. B. „Pils 0,4 l" */
  name: string;
  /** Preis in Cent */
  priceCents: number;
  /** 1–3-Buchstaben-Kürzel für das Glyph-Feld, z. B. „P", „W²" */
  glyph?: string;
  /** Ist dieser Button gerade im aktiven Buchungs-Loading-Zustand? */
  isLoading?: boolean;
  /** Sind alle Buchungs-Buttons disabled (andere Buchung läuft)? */
  disabled?: boolean;
  onClick: () => void;
}

export default function SortenButton({
  name,
  priceCents,
  glyph,
  isLoading = false,
  disabled = false,
  onClick,
}: SortenButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const border = isLoading ? '1px solid var(--korps-rot)' : '1px solid var(--line)';
  const boxShadow = isLoading ? '0 0 0 1px var(--korps-rot), var(--sh-2)' : 'var(--sh-1)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${name} buchen, ${formatCents(priceCents)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: hovered && !disabled ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        border,
        borderRadius: 'var(--r-3)',
        padding: 14,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 150ms var(--ease-stempel)',
        boxShadow,
        width: '100%',
        fontFamily: 'var(--font-sans)',
        opacity: disabled && !isLoading ? 0.6 : 1,
        transform: pressed && !disabled ? 'scale(.985)' : 'none',
      }}
    >
      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 68,
            color: 'var(--korps-rot)',
          }}
        >
          <Spinner size="h-6 w-6" />
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 22,
              color: 'var(--korps-rot)',
              letterSpacing: '0.02em',
              marginBottom: 6,
            }}
          >
            {glyph ?? name.charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--tinte)',
            }}
          >
            {name}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--fg-3)',
              marginTop: 4,
            }}
          >
            {formatCents(priceCents)}
          </div>
        </>
      )}
    </button>
  );
}
