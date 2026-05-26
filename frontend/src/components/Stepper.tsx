import { useState } from 'react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function Stepper({ value, onChange, min = 0, max = 99, step = 1 }: StepperProps) {
  const [pressedMinus, setPressedMinus] = useState(false);
  const [pressedPlus, setPressedPlus] = useState(false);

  const canDecrement = value - step >= min;
  const canIncrement = value + step <= max;

  const btnBase: React.CSSProperties = {
    width: 44,
    height: 44,
    border: 'none',
    borderRadius: 'var(--r-2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-sans)',
    fontSize: 22,
    fontWeight: 400,
    color: 'var(--kreide)',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 80ms, background 100ms',
    lineHeight: 1,
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0,
        background: 'var(--bg-card)',
        borderRadius: 'var(--r-pill)',
        border: '1px solid var(--line)',
        padding: 2,
        boxShadow: 'var(--sh-1)',
      }}
    >
      {/* Minus */}
      <button
        aria-label="Verringern"
        disabled={!canDecrement}
        onClick={() => canDecrement && onChange(value - step)}
        onMouseDown={() => setPressedMinus(true)}
        onMouseUp={() => setPressedMinus(false)}
        onMouseLeave={() => setPressedMinus(false)}
        style={{
          ...btnBase,
          background: canDecrement ? 'var(--korps-rot)' : 'var(--tinte-4)',
          transform: pressedMinus ? 'scale(0.92)' : 'scale(1)',
          cursor: canDecrement ? 'pointer' : 'not-allowed',
        }}
      >
        −
      </button>

      {/* Wert */}
      <span
        style={{
          minWidth: 40,
          textAlign: 'center',
          fontFamily: 'var(--font-ui)',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--fg)',
          userSelect: 'none',
        }}
      >
        {value}
      </span>

      {/* Plus */}
      <button
        aria-label="Erhöhen"
        disabled={!canIncrement}
        onClick={() => canIncrement && onChange(value + step)}
        onMouseDown={() => setPressedPlus(true)}
        onMouseUp={() => setPressedPlus(false)}
        onMouseLeave={() => setPressedPlus(false)}
        style={{
          ...btnBase,
          background: canIncrement ? 'var(--korps-rot)' : 'var(--tinte-4)',
          transform: pressedPlus ? 'scale(0.92)' : 'scale(1)',
          cursor: canIncrement ? 'pointer' : 'not-allowed',
        }}
      >
        +
      </button>
    </div>
  );
}
