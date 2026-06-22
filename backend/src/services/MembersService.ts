import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from './AuthService.js';
import type { MembersRepo } from '../db/repos/MembersRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { MemberRow, MemberStatus } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

// Re-Export für Bestandsimporte (Routen importieren toPublicMember von hier).
export { toPublicMember, type PublicMember } from './publicMember.js';

// ---------------------------------------------------------------------------
// MembersService — Business-Logik für Mitgliederverwaltung
// ---------------------------------------------------------------------------

export class MembersService {
  constructor(
    private readonly members: MembersRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  // ---------------------------------------------------------------------------
  // Lesen
  // ---------------------------------------------------------------------------

  findAll(includeInactive = false): MemberRow[] {
    return this.members.findAll(includeInactive);
  }

  /** Bebuchbare Mitglieder für den Theken-/Allgemein-Modus, sortiert nach Kategorie. */
  findBookable(): MemberRow[] {
    return this.members.findBookable();
  }

  findById(id: number): MemberRow {
    const member = this.members.findById(id);
    if (!member) {
      throw new AppError('Mitglied nicht gefunden', 404, 'NOT_FOUND');
    }
    return member;
  }

  // ---------------------------------------------------------------------------
  // Anlegen
  // ---------------------------------------------------------------------------

  async create(
    input: {
      username: string;
      display_name: string;
      password: string;
      role?: 'admin' | 'member';
      member_status?: MemberStatus;
    },
    actorId: number,
  ): Promise<MemberRow> {
    const existing = this.members.findByUsername(input.username);
    if (existing) {
      throw new AppError('Username bereits vergeben', 409, 'USERNAME_TAKEN');
    }

    const password_hash = await bcrypt.hash(input.password, BCRYPT_COST);

    const member = this.members.create({
      username: input.username,
      display_name: input.display_name,
      password_hash,
      role: input.role ?? 'member',
      member_status: input.member_status ?? 'aktiv',
    });

    this.auditLog.create({
      event_type: 'member_created',
      actor_id: actorId,
      target_type: 'member',
      target_id: member.id,
      meta: {
        username: input.username,
        role: input.role ?? 'member',
        member_status: input.member_status ?? 'aktiv',
      },
    });

    return member;
  }

  // ---------------------------------------------------------------------------
  // Aktualisieren
  // ---------------------------------------------------------------------------

  async update(
    id: number,
    input: {
      display_name?: string;
      password?: string;
      role?: 'admin' | 'member';
      member_status?: MemberStatus;
      can_book_for_others?: boolean;
    },
    actorId: number,
  ): Promise<MemberRow> {
    const existing = this.members.findById(id);
    if (!existing) {
      throw new AppError('Mitglied nicht gefunden', 404, 'NOT_FOUND');
    }

    let password_hash: string | undefined = undefined;
    if (input.password !== undefined) {
      password_hash = await bcrypt.hash(input.password, BCRYPT_COST);
    }

    const updated = this.members.update(id, {
      display_name: input.display_name,
      password_hash,
      role: input.role,
      member_status: input.member_status,
      can_book_for_others:
        input.can_book_for_others === undefined ? undefined : input.can_book_for_others ? 1 : 0,
    });

    this.auditLog.create({
      event_type: 'member_updated',
      actor_id: actorId,
      target_type: 'member',
      target_id: id,
      meta: {
        changed_fields: [
          ...(input.display_name !== undefined ? ['display_name'] : []),
          ...(input.password !== undefined ? ['password'] : []),
          ...(input.role !== undefined ? ['role'] : []),
          ...(input.member_status !== undefined ? ['member_status'] : []),
          ...(input.can_book_for_others !== undefined ? ['can_book_for_others'] : []),
        ],
      },
    });

    return updated!;
  }

  // ---------------------------------------------------------------------------
  // Soft-Delete (Deaktivieren)
  // ---------------------------------------------------------------------------

  deactivate(id: number, actorId: number): void {
    if (id === actorId) {
      throw new AppError('Eigenes Konto kann nicht deaktiviert werden', 400, 'SELF_DEACTIVATION');
    }

    const member = this.members.findById(id);
    if (!member) {
      throw new AppError('Mitglied nicht gefunden', 404, 'NOT_FOUND');
    }

    if (member.is_active === 0) {
      throw new AppError('Mitglied ist bereits deaktiviert', 409, 'ALREADY_INACTIVE');
    }

    this.members.deactivate(id);

    this.auditLog.create({
      event_type: 'member_deactivated',
      actor_id: actorId,
      target_type: 'member',
      target_id: id,
      meta: { username: member.username },
    });
  }
}
