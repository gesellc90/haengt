import TallyStrokes from './TallyStrokes.js';

interface SaldoCardProps {
  /** Saldo in Cent (negativ = schuldet Geld) */
  balanceCents: number;
  /** Anzahl offener Striche diesen Monat, optional */
  stricheMonat?: number;
  /**
   * Wenn true: Der zuletzt gesetzte Strich wird mit der Strichmacher-Animation
   * eingezeichnet (wird an TallyStrokes weitergereicht).
   */
  animateLatest?: boolean;
  /** Eyebrow-Label über dem Betrag (Default: „Dein offener Strich") */
  label?: string;
  /** Kursive Unterzeile statt der Standard-Sprüche (z. B. im Theken-Modus) */
  subline?: string;
}

function formatCurrency(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

export default function SaldoCard({
  balanceCents,
  stricheMonat,
  animateLatest = false,
  label = 'Dein offener Strich',
  subline,
}: SaldoCardProps) {
  const isPaid = balanceCents <= 0;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: '20px 18px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--sh-2)',
      }}
    >
      {/* 3px Korps-Rot-Topstreifen */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--korps-rot)',
        }}
      />

      {/* Label-Zeile */}
      <div
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase' as const,
          color: 'var(--fg-3)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      {/* Betrag */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 56,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          color: isPaid ? 'var(--erfolg)' : 'var(--korps-rot)',
        }}
      >
        {formatCurrency(balanceCents)}
      </div>

      {/* Sub-Zeile */}
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 16,
          color: 'var(--fg-2)',
          marginTop: 6,
        }}
      >
        {subline ?? (isPaid ? 'Sauber. Du hängst nicht.' : 'Schoppe weiter — oder tilg.')}
      </div>

      {/* Striche diesen Monat — als echte Tally-Grafik mit optionaler Strichmacher-Animation */}
      {stricheMonat !== undefined && stricheMonat > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--line)',
          }}
        >
          <TallyStrokes
            count={stricheMonat}
            color="var(--tinte)"
            size={1.1}
            animateLatest={animateLatest}
            label={`${stricheMonat} Striche diesen Monat`}
          />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
            }}
          >
            diesen Monat
          </span>
        </div>
      )}
    </div>
  );
}
