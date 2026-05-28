/**
 * Sigel — Das gestempelte Hängt!-Wappen.
 *
 * Außenring: Schriftzug „HÄNGT! · JEDER STRICH ZÄHLT ·" in Cinzel/Messing.
 * Innenfeld: stilisierter Tally-Strichblock (||||̶) auf Korps-Rot.
 * Compass-Punkte: vier Messing-Dots an Nord/Süd/Ost/West.
 *
 * Props:
 *  - size  Breite/Höhe in px (default: 80)
 *  - label Zugänglicher Name für Screen-Reader (default: „Hängt! — Jeder Strich zählt")
 */
interface SigelProps {
  size?: number;
  label?: string;
}

export default function Sigel({
  size = 80,
  label = 'Hängt! — Jeder Strich zählt',
}: SigelProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={label}
    >
      <defs>
        {/* Pfad für den Umlauftext — Kreis mit r=82 */}
        <path
          id="sigel-circle-text"
          d="M 100 100 m -82 0 a 82 82 0 1 1 164 0 a 82 82 0 1 1 -164 0"
        />
      </defs>

      {/* Hintergrund-Kreis Korps-Rot */}
      <circle cx="100" cy="100" r="92" fill="#7a1c2a" />

      {/* Außenring — doppelte Messing-Linie */}
      <circle cx="100" cy="100" r="92" fill="none" stroke="#c89c4d" strokeWidth="2" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#c89c4d" strokeWidth="0.6" />

      {/* Innenkreis — Pergament */}
      <circle cx="100" cy="100" r="68" fill="#fbf3df" />
      <circle cx="100" cy="100" r="68" fill="none" stroke="#c89c4d" strokeWidth="1.5" />

      {/* Umlauftext in Cinzel/Messing */}
      <text
        fontFamily="Cinzel, 'Trajan Pro', serif"
        fontSize="11"
        fontWeight="700"
        fill="#c89c4d"
        letterSpacing="3"
      >
        <textPath href="#sigel-circle-text" startOffset="2%">
          HÄNGT! · JEDER STRICH ZÄHLT · HÄNGT! · JEDER STRICH ZÄHLT ·
        </textPath>
      </text>

      {/* Tally-Block ||||̶ auf Pergament — Striche in Korps-Rot */}
      <g stroke="#7a1c2a" strokeWidth="5" strokeLinecap="round">
        <line x1="76" y1="78" x2="76" y2="128" />
        <line x1="88" y1="78" x2="88" y2="128" />
        <line x1="100" y1="78" x2="100" y2="128" />
        <line x1="112" y1="78" x2="112" y2="128" />
        {/* Diagonale — der 5. Strich */}
        <line x1="68" y1="124" x2="120" y2="82" />
      </g>

      {/* Kompass-Punkte in Messing (Nord/Süd/Ost/West) */}
      <g fill="#c89c4d">
        <circle cx="100" cy="18"  r="2.5" />
        <circle cx="100" cy="182" r="2.5" />
        <circle cx="18"  cy="100" r="2.5" />
        <circle cx="182" cy="100" r="2.5" />
      </g>
    </svg>
  );
}
