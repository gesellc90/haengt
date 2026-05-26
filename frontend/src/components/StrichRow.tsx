import TallyStrokes from './TallyStrokes.js';

type MemberRole = 'senior' | 'aktiver' | 'fux';

/** Hilfsfunktion: Cent-Betrag als Euro-String */
function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  });
}

interface StrichRowProps {
  displayName: string;
  role: MemberRole;
  tallyCount: number;
  balanceCents: number;
  isPaid: boolean;
}

function getAvatarStyle(role: MemberRole): React.CSSProperties {
  const base: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--kreide)',
    flexShrink: 0,
    letterSpacing: '0.04em',
  };
  switch (role) {
    case 'senior':
      return { ...base, background: 'var(--eiche)' };
    case 'fux':
      return { ...base, background: 'var(--bg-2)', color: 'var(--fg-2)' };
    case 'aktiver':
    default:
      return { ...base, background: 'var(--korps-rot)' };
  }
}

export default function StrichRow({
  displayName,
  role,
  tallyCount,
  balanceCents,
  isPaid,
}: StrichRowProps) {
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const tallyColor = isPaid ? 'var(--erfolg)' : 'var(--korps-rot)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto auto',
        alignItems: 'center',
        gap: 10,
        padding: '10px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      {/* Avatar */}
      <div style={getAvatarStyle(role)}>{initials}</div>

      {/* Name */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--fg)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {displayName}
      </span>

      {/* Strichbild */}
      <TallyStrokes count={tallyCount} size={0.9} color={tallyColor} />

      {/* Saldo */}
      <span
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          fontWeight: 600,
          color: isPaid ? 'var(--erfolg)' : 'var(--korps-rot)',
          whiteSpace: 'nowrap',
        }}
      >
        {formatCents(balanceCents)}
      </span>
    </div>
  );
}
