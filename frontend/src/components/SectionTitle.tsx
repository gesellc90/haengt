import type { ReactNode } from 'react';

/** Abschnitts-Titel im Eyebrow-Stil (kleine Versalien, Korps-Rot-Unterstrich) */
export default function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--tinte-3)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        margin: '0 0 12px',
        paddingBottom: 6,
        borderBottom: '2px solid var(--korps-rot)',
        display: 'inline-block',
      }}
    >
      {children}
    </h2>
  );
}
