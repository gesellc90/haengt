// ---------------------------------------------------------------------------
// API-Response-Typen (spiegeln die Backend-Schemas wider)
// ---------------------------------------------------------------------------

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// -- Auth -------------------------------------------------------------------

export interface LoginResponse {
  token: string;
  member: PublicMember;
}

// -- Members ----------------------------------------------------------------

export type MemberStatus = 'aktiv' | 'inaktiv' | 'alter_herr' | 'freund';

export interface PublicMember {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'member';
  is_active: 0 | 1;
  member_status: MemberStatus;
  can_book_for_others: 0 | 1;
  email: string | null;
  avatar_path: string | null;
  created_at: string;
  updated_at: string;
}

// -- Drinks -----------------------------------------------------------------

export interface DrinkWithCurrentPrice {
  id: number;
  name: string;
  is_available: 0 | 1;
  current_price_cents: number | null;
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

// -- Bookings ---------------------------------------------------------------

export interface BookingRow {
  id: number;
  member_id: number;
  drink_id: number;
  price_cents_snapshot: number;
  booked_at: string;
  voided_at: string | null;
  void_reason: string | null;
  booked_by_id: number | null;
}

export interface PaginatedBookings {
  items: BookingRow[];
  hasMore: boolean;
}

// -- Zeiger -----------------------------------------------------------------

export type ZeigerArt = 'veranstaltung' | 'besuch';
export type ZeigerStatus = 'offen' | 'geschlossen';

export interface ZeigerRow {
  id: number;
  titel: string;
  art: ZeigerArt;
  verbindung_id: number | null;
  status: ZeigerStatus;
  created_by: number;
  created_at: string;
  anzahl_bundesbrueder: number | null;
  anzahl_gaeste: number | null;
  closed_at: string | null;
  closed_by: number | null;
}

// -- Verbindungen -----------------------------------------------------------

export interface VerbindungRow {
  id: number;
  name: string;
  zirkel: string | null;
  ort: string | null;
  active: 0 | 1;
  created_at: string;
}
