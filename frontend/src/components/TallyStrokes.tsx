interface TallyStrokesProps {
  /** Anzahl der Striche (0–n) */
  count: number;
  /** SVG stroke-color, default: 'currentColor' */
  color?: string;
  /** Skalierungsfaktor, default: 1 */
  size?: number;
  /** Gap zwischen Gruppen in px, default: 6 */
  gap?: number;
  /** aria-label für Screen-Reader */
  label?: string;
  /**
   * Wenn true: Der zuletzt gesetzte Strich (letzter Strich im letzten Block)
   * wird mit der Strichmacher-Animation (.strich-latest) eingezeichnet.
   * 240ms stroke-dashoffset, cubic-bezier stempel-artig.
   */
  animateLatest?: boolean;
}

export default function TallyStrokes({
  count,
  color = 'currentColor',
  size = 1,
  gap = 6,
  label,
  animateLatest = false,
}: TallyStrokesProps) {
  if (count <= 0) {
    return <span style={{ fontFamily: 'var(--font-sans)', color: 'var(--fg-4)' }}>—</span>;
  }

  const fives = Math.floor(count / 5);
  const rest = count % 5;

  const groups: number[] = [];
  for (let i = 0; i < fives; i++) groups.push(5);
  if (rest > 0) groups.push(rest);

  const H = Math.round(22 * size);
  const sw = 2 * size;
  const lastGroupIdx = groups.length - 1;

  function renderGroup(n: number, k: number) {
    // Soll der letzte Strich in dieser Gruppe animiert werden?
    const isLastGroup = animateLatest && k === lastGroupIdx;

    if (n === 5) {
      const W = Math.round(26 * size);
      return (
        <svg key={k} width={W} height={H} viewBox="0 0 26 26" aria-hidden="true">
          <g stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none">
            <line x1="3" y1="3" x2="3" y2="23" />
            <line x1="8" y1="3" x2="8" y2="23" />
            <line x1="13" y1="3" x2="13" y2="23" />
            <line x1="18" y1="3" x2="18" y2="23" />
            {/* Die Diagonale ist der 5. (letzte) Strich — sie bekommt die Animation */}
            <line
              x1="1" y1="20" x2="22" y2="6"
              className={isLastGroup ? 'strich-latest' : undefined}
            />
          </g>
        </svg>
      );
    }

    const stepX = 5;
    const W = Math.round((3 + (n - 1) * stepX + 3) * size);
    const vb = `0 0 ${3 + (n - 1) * stepX + 3} 26`;
    const lines = [];
    for (let i = 0; i < n; i++) {
      const x = 3 + i * stepX;
      // Nur der letzte senkrechte Strich in der letzten Gruppe wird animiert
      const isLastLine = isLastGroup && i === n - 1;
      lines.push(
        <line
          key={i}
          x1={x} y1="3" x2={x} y2="23"
          className={isLastLine ? 'strich-latest' : undefined}
        />,
      );
    }
    return (
      <svg key={k} width={W} height={H} viewBox={vb} aria-hidden="true">
        <g stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none">
          {lines}
        </g>
      </svg>
    );
  }

  return (
    <span
      role="img"
      aria-label={label ?? `${count} Striche`}
      style={{ display: 'inline-flex', alignItems: 'center', gap }}
    >
      {groups.map((n, k) => renderGroup(n, k))}
    </span>
  );
}
