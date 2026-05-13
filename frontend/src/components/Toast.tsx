import { useToast, type ToastVariant } from '../contexts/ToastContext.js';

// ---------------------------------------------------------------------------
// Farbklassen je Variante
// ---------------------------------------------------------------------------

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-slate-700 text-white',
};

const variantIcon: Record<ToastVariant, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
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
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={`flex min-w-64 items-center gap-3 rounded-xl px-4 py-3 shadow-lg ${variantClasses[toast.variant]}`}
        >
          <span className="text-lg font-bold" aria-hidden>
            {variantIcon[toast.variant]}
          </span>
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            aria-label="Benachrichtigung schließen"
            className="ml-2 rounded p-1 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
