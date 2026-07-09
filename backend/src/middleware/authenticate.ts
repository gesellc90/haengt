import type { Request, Response, NextFunction } from 'express';
import type { AuthService, JwtPayload } from '../services/AuthService.js';

/**
 * Erweitert den Express-Request um den verifizierten JWT-Payload.
 * Verfügbar auf allen Routen, die `authenticate` als Middleware nutzen.
 */
export interface AuthenticatedRequest extends Request {
  auth: JwtPayload;
}

/**
 * Prüft den Bearer-Token im `Authorization`-Header.
 * Setzt `req.auth` und ruft `next()` auf Erfolg.
 * Antwortet mit 401, wenn kein oder ungültiges Token.
 */
export function authenticate(authService: AuthService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Kein Authentifizierungstoken angegeben' });
      return;
    }

    const token = header.slice(7);
    try {
      // Verifiziert das Token UND prüft, dass das Mitglied noch existiert und
      // aktiv ist – so wirken Deaktivierung/Rollenentzug sofort, nicht erst
      // nach Token-Ablauf.
      const { payload } = authService.verifyActiveMember(token);
      (req as AuthenticatedRequest).auth = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token' });
    }
  };
}
