import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import type { MembersRepo } from '../db/repos/MembersRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { TokenBlocklistRepo } from '../db/repos/TokenBlocklistRepo.js';
import type { MemberRow } from '../db/types.js';

export const BCRYPT_COST = 10;

export interface JwtPayload {
  sub: string; // member id als String
  username: string;
  role: 'admin' | 'member';
  jti: string; // JWT ID – zum Widerrufen (Logout)
  exp: number; // Ablaufzeitpunkt (Sekunden seit Epoch, vom JWT gesetzt)
  iat: number; // Ausstellungszeitpunkt
}

export interface LoginResult {
  token: string;
  member: Pick<MemberRow, 'id' | 'username' | 'display_name' | 'role'>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE',
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  constructor(
    private readonly members: MembersRepo,
    private readonly auditLog: AuditLogRepo,
    private readonly blocklist: TokenBlocklistRepo,
    private readonly jwtSecret: string,
    private readonly jwtExpiresIn: string,
  ) {}

  // ---------------------------------------------------------------------------
  // Passwort-Hashing (für seed.ts und spätere Member-Verwaltung in M4)
  // ---------------------------------------------------------------------------

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_COST);
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(
    username: string,
    password: string,
    meta?: Record<string, unknown>,
  ): Promise<LoginResult> {
    // Abgelaufene Blocklist-Einträge gelegentlich aufräumen
    this.blocklist.pruneExpired();

    const member = this.members.findByUsername(username);

    // Timing-Safe: auch bei unbekanntem User einen bcrypt-Dummy-Vergleich machen,
    // damit Angreifer nicht per Response-Zeit feststellen können, ob ein User existiert.
    const hashToCompare =
      member?.password_hash ?? '$2a$10$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

    const passwordValid = await bcrypt.compare(password, hashToCompare);

    if (!member || !passwordValid) {
      this.auditLog.create({
        event_type: 'login_failure',
        actor_id: member?.id ?? null,
        meta: { username, ...meta },
      });
      throw new AuthError('Ungültige Anmeldedaten', 'INVALID_CREDENTIALS');
    }

    if (member.is_active === 0) {
      this.auditLog.create({
        event_type: 'login_failure',
        actor_id: member.id,
        meta: { username, reason: 'account_inactive', ...meta },
      });
      throw new AuthError('Konto ist deaktiviert', 'ACCOUNT_INACTIVE');
    }

    const jti = randomUUID();
    // exp und iat werden von jwt.sign gesetzt – daher Omit
    const payload: Omit<JwtPayload, 'exp' | 'iat'> = {
      sub: String(member.id),
      username: member.username,
      role: member.role,
      jti,
    };

    const token = jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    });

    this.auditLog.create({
      event_type: 'login_success',
      actor_id: member.id,
      meta: { username, ...meta },
    });

    return {
      token,
      member: {
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        role: member.role,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Token verifizieren
  // ---------------------------------------------------------------------------

  verifyToken(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.jwtSecret, {
      algorithms: ['HS256'],
    }) as JwtPayload;

    if (this.blocklist.isBlocked(decoded.jti)) {
      throw new jwt.JsonWebTokenError('Token wurde widerrufen');
    }

    return decoded;
  }

  // ---------------------------------------------------------------------------
  // Logout (Token zur Blocklist hinzufügen)
  // ---------------------------------------------------------------------------

  /**
   * Fügt die JTI zur Blocklist hinzu. `exp` kommt aus dem verifizierten
   * JWT-Payload (Sekunden seit Epoch, JWT-Standard).
   */
  logout(jti: string, exp: number): void {
    const expiresAt = new Date(exp * 1000).toISOString();
    this.blocklist.add(jti, expiresAt);
  }
}
