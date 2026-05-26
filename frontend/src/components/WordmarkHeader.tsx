interface WordmarkHeaderProps {
  /** Initialen für den Avatar-Button (max. 2 Zeichen). Fehlt → kein Avatar. */
  avatarInitials?: string;
  /** Callback wenn der Avatar-Button geklickt wird */
  onAvatarClick?: () => void;
}

export default function WordmarkHeader({ avatarInitials, onAvatarClick }: WordmarkHeaderProps) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--eiche)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 52,
        borderBottom: '1px solid rgba(0,0,0,0.18)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      {/* Wordmark */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--kreide)',
          letterSpacing: '0.04em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        Hängt
        <span style={{ color: 'var(--messing)' }}>!</span>
      </span>

      {/* Avatar */}
      {avatarInitials && (
        <button
          onClick={onAvatarClick}
          aria-label="Profil"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--korps-rot)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--kreide)',
            letterSpacing: '0.06em',
            flexShrink: 0,
          }}
        >
          {avatarInitials}
        </button>
      )}
    </header>
  );
}
