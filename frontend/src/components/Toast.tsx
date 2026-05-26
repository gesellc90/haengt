import { Check, X, Info } from 'lucide-react';
import { useToast, type ToastVariant } from '../contexts/ToastContext.js';

// ---------------------------------------------------------------------------
// Token-basierte Varianten-Styles
// ---------------------------------------------------------------------------

const variantStyles: Record<ToastVariant, React.CSSProperties> = {
  success: {
    background: 'var(--erfolg)',
    color: 'var(--kreide)',
  },
  error: {
    background: 'var(--korps-rot)',
    color: 'var(--kreide)',
  },
  info: {
    background: 'var(--info)',
    color: 'var(--kreide)',
  },
};

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: <Check size={16} aria-hidden />,
  error: <X size={16} aria-hidden />,
  info: <Info size={16} aria-hidden />,
};

// ---------------------------------------------------------------------------
// Toast-Container — rendert alle aktiven Toasts
// ---------------------------------------------------------------------------

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Benachrichtigungen"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          style={{
            display: 'flex',
            minWidth: 260,
            maxWidth: 360,
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 'var(--r-3)',
            boxShadow: 'var(--sh-3)',
            ...variantStyles[toast.variant],
          }}
        >
          <span style={{ display: 'flex', flexShrink: 0 }}>{variantIcon[toast.variant]}</span>
          <span
            style={{
              flex: 1,
              fontSize: 14,
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
            }}
          >
            {toast.message}
          </span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Benachrichtigung schließen"
            style={{
              marginLeft: 8,
              padding: 4,
              borderRadius: 'var(--r-2)',
              border: 'none',
              background: 'rgba(255,255,255,0.15)',
              color: 'inherit',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
