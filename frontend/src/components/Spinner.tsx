interface SpinnerProps {
  /** Größe der Spinner-Fläche in Tailwind-Klassen (z. B. 'h-6 w-6') */
  size?: string;
  label?: string;
}

export default function Spinner({ size = 'h-6 w-6', label = 'Lädt…' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-block">
      <svg
        className={`animate-spin ${size}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ color: 'var(--korps-rot)' }}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </span>
  );
}
