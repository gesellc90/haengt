import { NavLink, Outlet } from 'react-router-dom';

function adminNavClass({ isActive }: { isActive: boolean }) {
  return [
    'min-h-touch inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-blue-600 text-white shadow-sm'
      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
  ].join(' ');
}

export default function AdminLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Administration</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mitglieder, Getränke und Buchungen verwalten
        </p>
      </div>

      {/* Tab-Navigation */}
      <nav
        aria-label="Admin-Navigation"
        className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
      >
        <NavLink to="/admin/mitglieder" className={adminNavClass}>
          Mitglieder
        </NavLink>
        <NavLink to="/admin/getraenke" className={adminNavClass}>
          Getränke
        </NavLink>
        <NavLink to="/admin/buchungen" className={adminNavClass}>
          Buchungen
        </NavLink>
        <NavLink to="/admin/berichte" className={adminNavClass}>
          Berichte
        </NavLink>
      </nav>

      {/* Unter-Seite */}
      <Outlet />
    </div>
  );
}
