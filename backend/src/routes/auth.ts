import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema } from '../schemas/auth.js';
import { AuthError } from '../services/AuthService.js';
import { authenticate, type AuthenticatedRequest } from '../middleware/authenticate.js';
import { toPublicMember } from '../services/MembersService.js';
import type { AuthService } from '../services/AuthService.js';
import type { MembersService } from '../services/MembersService.js';

/**
 * Erstellt den Auth-Router.
 * Rate-Limit: 5 Versuche pro IP und 15 Minuten auf POST /login.
 */
export function createAuthRouter(authService: AuthService, membersService: MembersService): Router {
  const router = Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 Minuten
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
    skipSuccessfulRequests: false,
    // In E2E-Tests deaktivieren (alle Requests kämen von 127.0.0.1,
    // der gemeinsame Bucket würde nach 5 Logins die restlichen Tests blockieren).
    skip: () => process.env['DISABLE_RATE_LIMIT'] === 'true',
  });

  // ---------------------------------------------------------------------------
  // POST /auth/login
  // ---------------------------------------------------------------------------
  router.post('/login', loginLimiter, async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() });
      return;
    }

    const ip = req.ip ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    try {
      const result = await authService.login(parsed.data.username, parsed.data.password, {
        ip,
        userAgent,
      });
      res.status(200).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(401).json({ error: err.message, code: err.code });
        return;
      }
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // GET /auth/me  (geschützt)
  // ---------------------------------------------------------------------------
  router.get('/me', authenticate(authService), (req, res, next) => {
    try {
      const { auth } = req as AuthenticatedRequest;
      const member = membersService.findById(Number(auth.sub));
      res.json(toPublicMember(member));
    } catch (err) {
      next(err);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /auth/logout  (geschützt)
  // ---------------------------------------------------------------------------
  router.post('/logout', authenticate(authService), (req, res) => {
    const { auth } = req as AuthenticatedRequest;
    authService.logout(auth.jti, auth.exp);
    res.status(204).send();
  });

  return router;
}
