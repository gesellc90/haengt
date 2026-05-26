import TallyStrokes from './TallyStrokes.js';

type MemberRole = 'Senior' | 'Fux' | 'Aktiver';

interface StrichRowProps {
  /** Cerevis-Name + Familienname, z. B. „Carl „Knirps" v. König" */
  displayName: string;
  role: MemberRole;
  /** Anzahl offener Striche */
  strikeCount: number;
  /** Saldo in Cent */
  balanceCents: number;
  /** Ist der Saldo beglichen? */
  isPaid?: boolean;
  onClick?: () => void;
}

function formatCents(cents: number): string {
  return (Math.abs(cents) / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function getAvatarStyle(role: MemberRole): React.CSSProperties {
  switch (role) {
    case 'Senior':
      return {
        background: 'var(--eiche)',
        border: '1px solid var(--messing)',
        color: 'var(--kreide)',
      };
    case 'Fux':
      return {
        background: 'var(--bg-card)',
        border: '1px solid var(--line-2)',
        color: 'var(--fg-2)',
      };
    default:
      return {
        background: 'var(--korps-rot)',
        color: 'var(--kreide)',
      };
  }
}

export default function StrichRow({
  displayName,
  role,
  strikeCount,
  balanceCents,
  isPaid = false,
  onClick,
}: StrichRowProps) {
  const initial = displayName
    .replace(/[„".«»]/g, '')
    .trim()
    .charAt(0)
    .toUpperCase();

  const avatarStyle = getAvatarStyle(role);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto auto',
        gap: 12,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--line)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 12,
          flexShrink: 0,
          ...avatarStyle,
        }}
      >
        {initial}
      </div>

      {/* Name + Rolle */}
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--tinte)',
            lineHeight: 1.2,
          }}
        >
          {displayName}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{role}</div>
      </div>

      {/* Tally */}
      <TallyStrokes
        count={strikeCount}
        color={isPaid ? 'var(--fg-4)' : 'var(--tinte)'}
        size={0.9}
      />

      {/* Saldo */}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 15,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 56,
          textAlign: 'right',
          color: balanceCents === 0 ? 'var(--fg-3)' : isPaid ? '#4d6b3a' : 'var(--korps-rot)',
        }}
      >
        {balanceCents === 0 ? '—' : formatCents(balanceCents)}
      </div>
    </div>
  );
}
