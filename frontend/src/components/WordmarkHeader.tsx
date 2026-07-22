interface WordmarkHeaderProps {
  /** 1–3 Buchstaben für den Avatar-Kreis, z. B. „CK" (Fallback ohne Bild) */
  avatarInitials?: string;
  /** Relativer Dateiname des Profilbilds (unter /avatars/…); überschreibt die Initialen */
  avatarPath?: string | null;
  /** Callback für Avatar-Klick (z. B. Profil öffnen) */
  onAvatarClick?: () => void;
}

export default function WordmarkHeader({
  avatarInitials,
  avatarPath,
  onAvatarClick,
}: WordmarkHeaderProps) {
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
      {/* Wortmarke: Cinzel, uppercase — „HÄNGT!" mit Messing-! */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          color: 'var(--kreide)',
        }}
      >
        Hängt<span style={{ color: 'var(--messing)' }}>!</span>
      </span>

      {/* Avatar-Kreis — 44×44px Touch-Target, visuell 32px */}
      {(avatarInitials || avatarPath) && (
        <button
          onClick={onAvatarClick}
          aria-label="Profil öffnen"
          style={{
            /* Touch-Target: mindestens 44×44px (WCAG 2.5.8) */
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: onAvatarClick ? 'pointer' : 'default',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            /* Kein outline: none — globales :focus-visible greift */
          }}
        >
          {/* Visueller Kreis (32px) innerhalb des größeren Hit-Bereichs:
              echtes Profilbild, sonst Initialen-Fallback. */}
          {avatarPath ? (
            <img
              aria-hidden="true"
              src={`/avatars/${avatarPath}`}
              alt=""
              width={32}
              height={32}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--messing)',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          ) : (
            <span
              aria-hidden="true"
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
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {avatarInitials}
            </span>
          )}
        </button>
      )}
    </header>
  );
}
