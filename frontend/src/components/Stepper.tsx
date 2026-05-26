import { useState } from 'react';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  label?: string;
}

export default function Stepper({ value, min = 0, max = 99, onChange, label }: StepperProps) {
  const [minusActive, setMinusActive] = useState(false);
  const [plusActive, setPlusActive] = useState(false);

  return (
    <div
      role="group"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        justifyContent: 'center',
        background: 'var(--bg-card)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-pill)',
        padding: '6px 10px',
      }}
    >
      <button
        aria-label="Weniger"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        onMouseDown={() => setMinusActive(true)}
        onMouseUp={() => setMinusActive(false)}
        onMouseLeave={() => setMinusActive(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: value <= min ? 'var(--tinte-4)' : 'var(--korps-rot)',
          color: 'var(--kreide)',
          fontSize: 20,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          transition: `transform 120ms var(--ease-stempel)`,
          transform: minusActive && value > min ? 'scale(.92)' : 'none',
          flexShrink: 0,
        }}
      >
        −
      </button>

      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 32,
          color: 'var(--tinte)',
          minWidth: 50,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>

      <button
        aria-label="Mehr"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        onMouseDown={() => setPlusActive(true)}
        onMouseUp={() => setPlusActive(false)}
        onMouseLeave={() => setPlusActive(false)}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: value >= max ? 'var(--tinte-4)' : 'var(--korps-rot)',
          color: 'var(--kreide)',
          fontSize: 20,
          fontWeight: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          transition: `transform 120ms var(--ease-stempel)`,
          transform: plusActive && value < max ? 'scale(.92)' : 'none',
          flexShrink: 0,
        }}
      >
        +
      </button>
    </div>
  );
}
