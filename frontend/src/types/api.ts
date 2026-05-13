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

export interface PublicMember {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'member';
  is_active: 0 | 1;
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
}

export interface PaginatedBookings {
  items: BookingRow[];
  hasMore: boolean;
}
