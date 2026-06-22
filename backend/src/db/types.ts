// ---------------------------------------------------------------------------
// DB-Row-Typen (spiegeln exakt die SQL-Schemas wider)
// ---------------------------------------------------------------------------

/** Korporationsstatus – unabhängig vom is_active-Login-/Soft-Delete-Flag. */
export type MemberStatus = 'aktiv' | 'inaktiv' | 'alter_herr' | 'freund';

export interface MemberRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string | null;
  role: 'admin' | 'member';
  is_active: 0 | 1;
  member_status: MemberStatus;
  can_book_for_others: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface DrinkRow {
  id: number;
  name: string;
  is_available: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface DrinkPriceRow {
  id: number;
  drink_id: number;
  price_cents: number;
  valid_from: string;
  created_at: string;
}

export interface BookingRow {
  id: number;
  member_id: number;
  drink_id: number;
  price_cents_snapshot: number;
  booked_at: string;
  voided_at: string | null;
  void_reason: string | null;
}

export interface AuditLogRow {
  id: number;
  event_type: string;
  actor_id: number | null;
  target_type: string | null;
  target_id: number | null;
  meta: string | null; // JSON-String
  created_at: string;
}
