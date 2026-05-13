export default function ReportPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 text-4xl">📊</div>
      <h2 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">Monats-Report</h2>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Der CSV-Download wird in M6 implementiert.
      </p>
      <button
        disabled
        className="min-h-touch inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
      >
        CSV herunterladen
      </button>
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Verfügbar ab M6</p>
    </div>
  );
}
