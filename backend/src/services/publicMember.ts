import type { MemberRow } from '../db/types.js';

// ---------------------------------------------------------------------------
// Öffentliches Member-Objekt (ohne password_hash)
// ---------------------------------------------------------------------------

export type PublicMember = Omit<MemberRow, 'password_hash'>;

export function toPublicMember(member: MemberRow): PublicMember {
  const { password_hash: _, ...rest } = member;
  return rest;
}
