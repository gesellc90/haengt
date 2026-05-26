import { useState } from 'react';
import Spinner from './Spinner.js';

/** Hilfsfunktion: Cent-Betrag als Euro-String */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

interface SortenButtonProps {
  name: string;
  priceCents: number;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function SortenButton({
  name,
  priceCents,
  onClick,
  disabled = false,
  isLoading = false,
}: SortenButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isDisabled = disabled || isLoading;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        width: '100%',
        minHeight: 80,
        padding: '12px 8px',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-3)',
        background: pressed ? 'var(--bg-2)' : hovered ? 'var(--bg-card)' : 'var(--bg-card)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled && !isLoading ? 0.6 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 100ms, background 120ms',
        boxShadow: hovered && !pressed ? 'var(--sh-1)' : 'none',
      }}
    >
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--fg)',
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--fg-3)',
            }}
          >
            {formatCents(priceCents)}
          </span>
        </>
      )}
    </button>
  );
}
