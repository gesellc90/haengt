interface WordmarkHeaderProps {
  /** 1–3 Buchstaben für den Avatar-Kreis, z. B. „CK" */
  avatarInitials?: string;
  /** Callback für Avatar-Klick (z. B. Profil öffnen) */
  onAvatarClick?: () => void;
}

export default function WordmarkHeader({ avatarInitials, onAvatarClick }: WordmarkHeaderProps) {
  return (
    <header
      style={{
        background: 'var(--eiche)',
        color: 'var(--kreide)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid var(--messing)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Wortmarke: Cormorant Garamond, 28px */}
      <span
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 700,
          fontSize: 28,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'baseline',
          gap: 2,
        }}
      >
        Hängt<span style={{ color: 'var(--messing)' }}>!</span>
      </span>

      {/* Avatar-Kreis */}
      {avatarInitials && (
        <button
          onClick={onAvatarClick}
          aria-label="Profil öffnen"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--korps-rot)',
            color: 'var(--kreide)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 12,
            border: '1px solid var(--messing)',
            cursor: onAvatarClick ? 'pointer' : 'default',
            padding: 0,
            outline: 'none',
          }}
        >
          {avatarInitials}
        </button>
      )}
    </header>
  );
}
