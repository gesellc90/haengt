/** Hilfsfunktion: Cent-Betrag als Euro-String */
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

interface SaldoCardProps {
  /** Offener Betrag in Cent (positiv = Schulden) */
  balanceCents: number;
  /** true = alles bezahlt */
  isPaid: boolean;
  /** Anzahl der heutigen Buchungen */
  todayCount?: number;
}

export default function SaldoCard({ balanceCents, isPaid, todayCount = 0 }: SaldoCardProps) {
  const balanceColor = isPaid ? 'var(--erfolg)' : 'var(--korps-rot)';

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--bg-card)',
        borderRadius: 'var(--r-3)',
        padding: '20px 20px 16px',
        boxShadow: 'var(--sh-2)',
        overflow: 'hidden',
      }}
    >
      {/* Korps-Rot Streifen oben */}
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

      {/* Saldo-Betrag */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 56,
          fontWeight: 700,
          lineHeight: 1,
          color: balanceColor,
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}
      >
        {formatCents(balanceCents)}
      </div>

      {/* Subtext */}
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 15,
          color: 'var(--fg-2)',
          marginBottom: 8,
        }}
      >
        {isPaid ? 'Konto ausgeglichen' : 'Offener Saldo'}
      </div>

      {/* Striche heute */}
      {todayCount > 0 && (
        <div
          style={{
            fontFamily: 'var(--font-hand)',
            fontSize: 14,
            color: 'var(--fg-3)',
          }}
        >
          {todayCount} {todayCount === 1 ? 'Strich' : 'Striche'} heute
        </div>
      )}
    </div>
  );
}
