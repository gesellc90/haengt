import type {
  VerbindungenRepo,
  CreateVerbindungInput,
  UpdateVerbindungInput,
} from '../db/repos/VerbindungenRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { VerbindungRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

// ---------------------------------------------------------------------------
// VerbindungenService — Geschäftslogik für Verbindungen (Couleur-Stammdaten)
//
// Bringt die Verbindungs-Verwaltung auf dieselbe Schichtung wie die übrigen
// Ressourcen (Route → Service → Repo) und ergänzt Audit-Logging, das bei
// direktem Repo-Zugriff bislang fehlte.
// ---------------------------------------------------------------------------

export class VerbindungenService {
  constructor(
    private readonly verbindungen: VerbindungenRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  findAll(includeInactive = false): VerbindungRow[] {
    return this.verbindungen.findAll(includeInactive);
  }

  create(input: CreateVerbindungInput, actorId: number): VerbindungRow {
    const row = this.verbindungen.create(input);

    this.auditLog.create({
      event_type: 'verbindung_created',
      actor_id: actorId,
      target_type: 'verbindung',
      target_id: row.id,
      meta: { name: row.name },
    });

    return row;
  }

  update(id: number, input: UpdateVerbindungInput, actorId: number): VerbindungRow {
    const updated = this.verbindungen.update(id, input);
    if (!updated) {
      throw new AppError('Verbindung nicht gefunden', 404, 'NOT_FOUND');
    }

    this.auditLog.create({
      event_type: 'verbindung_updated',
      actor_id: actorId,
      target_type: 'verbindung',
      target_id: id,
      meta: {
        changed_fields: Object.keys(input),
      },
    });

    return updated;
  }

  deactivate(id: number, actorId: number): void {
    const ok = this.verbindungen.deactivate(id);
    if (!ok) {
      throw new AppError('Verbindung nicht gefunden', 404, 'NOT_FOUND');
    }

    this.auditLog.create({
      event_type: 'verbindung_deactivated',
      actor_id: actorId,
      target_type: 'verbindung',
      target_id: id,
    });
  }
}
