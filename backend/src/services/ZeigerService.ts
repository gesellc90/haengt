import type { ZeigerRepo } from '../db/repos/ZeigerRepo.js';
import type { VerbindungenRepo } from '../db/repos/VerbindungenRepo.js';
import type { AuditLogRepo } from '../db/repos/AuditLogRepo.js';
import type { ZeigerRow } from '../db/types.js';
import { AppError } from '../middleware/errorHandler.js';

export class ZeigerService {
  constructor(
    private readonly zeiger: ZeigerRepo,
    private readonly verbindungen: VerbindungenRepo,
    private readonly auditLog: AuditLogRepo,
  ) {}

  // ---------------------------------------------------------------------------
  // Zeiger anlegen
  // ---------------------------------------------------------------------------

  create(
    actorId: number,
    input: {
      titel: string;
      art: 'veranstaltung' | 'besuch';
      verbindung_id?: number | null;
      anzahl_bundesbrueder?: number;
      anzahl_gaeste?: number;
    },
  ): ZeigerRow {
    if (input.verbindung_id !== null && input.verbindung_id !== undefined) {
      const v = this.verbindungen.findById(input.verbindung_id);
      if (!v) {
        throw new AppError('Verbindung nicht gefunden', 404, 'NOT_FOUND');
      }
      if (v.active === 0) {
        throw new AppError('Verbindung ist deaktiviert', 409, 'VERBINDUNG_INACTIVE');
      }
    }

    const row = this.zeiger.create({ ...input, created_by: actorId });

    this.auditLog.create({
      event_type: 'zeiger_created',
      actor_id: actorId,
      target_type: 'zeiger',
      target_id: row.id,
      meta: { titel: row.titel, art: row.art },
    });

    return row;
  }

  // ---------------------------------------------------------------------------
  // Zeiger auflisten
  // ---------------------------------------------------------------------------

  findAll(status?: 'offen' | 'geschlossen'): ZeigerRow[] {
    return this.zeiger.findAll(status);
  }

  // ---------------------------------------------------------------------------
  // Einzelnen Zeiger abrufen
  // ---------------------------------------------------------------------------

  findById(id: number): ZeigerRow {
    const row = this.zeiger.findById(id);
    if (!row) throw new AppError('Zeiger nicht gefunden', 404, 'NOT_FOUND');
    return row;
  }

  // ---------------------------------------------------------------------------
  // Teilaktualisierung (BBr/Gäste anpassen)
  // Nur erlaubt, solange der Zeiger offen ist.
  // ---------------------------------------------------------------------------

  update(
    id: number,
    actorId: number,
    input: { anzahl_bundesbrueder?: number; anzahl_gaeste?: number },
  ): ZeigerRow {
    const existing = this.findById(id);

    if (existing.status === 'geschlossen') {
      throw new AppError('Geschlossener Zeiger kann nicht bearbeitet werden', 409, 'ZEIGER_CLOSED');
    }

    const updated = this.zeiger.update(id, input);
    if (!updated) throw new AppError('Aktualisierung fehlgeschlagen', 500);

    this.auditLog.create({
      event_type: 'zeiger_updated',
      actor_id: actorId,
      target_type: 'zeiger',
      target_id: id,
      meta: input,
    });

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Zeiger schließen
  // ---------------------------------------------------------------------------

  close(
    id: number,
    actorId: number,
    input: { anzahl_bundesbrueder?: number; anzahl_gaeste?: number },
  ): ZeigerRow {
    const existing = this.findById(id);

    if (existing.status === 'geschlossen') {
      throw new AppError('Zeiger ist bereits geschlossen', 409, 'ZEIGER_ALREADY_CLOSED');
    }

    const updated = this.zeiger.update(id, {
      ...input,
      status: 'geschlossen',
      closed_at: new Date().toISOString(),
      closed_by: actorId,
    });
    if (!updated) throw new AppError('Schließen fehlgeschlagen', 500);

    this.auditLog.create({
      event_type: 'zeiger_closed',
      actor_id: actorId,
      target_type: 'zeiger',
      target_id: id,
      meta: {
        anzahl_bundesbrueder: updated.anzahl_bundesbrueder,
        anzahl_gaeste: updated.anzahl_gaeste,
      },
    });

    return updated;
  }
}
