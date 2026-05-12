import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './authenticate.js';

/**
 * Prüft, ob der eingeloggte User die erforderliche Rolle besitzt.
 * Muss **nach** `authenticate` eingebunden werden.
 *
 * @example
 * router.get('/admin/members', authenticate(authService), requireRole('admin'), handler)
 */
export function requireRole(role: 'admin' | 'member') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = (req as AuthenticatedRequest).auth;

    if (!auth) {
      res.status(401).json({ error: 'Nicht authentifiziert' });
      return;
    }

    // 'admin' hat Zugriff auf alle Routen; 'member' nur auf member-Routen
    if (role === 'admin' && auth.role !== 'admin') {
      res.status(403).json({ error: 'Unzureichende Berechtigung' });
      return;
    }

    next();
  };
}
