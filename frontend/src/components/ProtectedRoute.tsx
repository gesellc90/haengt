import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import Spinner from './Spinner.js';

interface ProtectedRouteProps {
  /**
   * Wenn angegeben, muss der User diese Rolle/Berechtigung haben.
   * - 'admin' | 'member' → exakte Rolle
   * - 'wk' → Wirtschaftskommission ODER Admin (Streich-Bereich)
   */
  role?: 'admin' | 'member' | 'wk';
}

/**
 * Schützt alle verschachtelten Routen.
 * - Nicht eingeloggt → /login
 * - Falsche Rolle → / (oder eine 403-Seite)
 */
export default function ProtectedRoute({ role }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, member, canStrike } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="h-10 w-10" label="Authentifizierung wird geprüft…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role === 'wk') {
    if (!canStrike) return <Navigate to="/" replace />;
  } else if (role && member?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
