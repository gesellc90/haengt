import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';

// ---------------------------------------------------------------------------
// Gemeinsame Avatar-Verarbeitung (Self-Service /auth/me/avatar UND Admin
// /members/:id/avatar). Zentral, damit Limit, Format und Dateibenennung an
// beiden Stellen identisch bleiben.
// ---------------------------------------------------------------------------

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_SIZE_PX = 256;

/** multer-Instanz: Speicher-Puffer, 5-MB-Limit, nur Bild-MIME-Typen. */
export const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien erlaubt'));
    }
  },
});

/**
 * Normalisiert das hochgeladene Bild auf 256×256 WebP und legt es unter
 * `<avatarDir>/<memberId>.webp` ab. Gibt den relativen Dateinamen zurück
 * (wird in members.avatar_path gespeichert).
 */
export async function saveAvatar(
  avatarDir: string,
  memberId: number,
  buffer: Buffer,
): Promise<string> {
  fs.mkdirSync(avatarDir, { recursive: true });
  const filename = `${memberId}.webp`;
  const dest = path.join(avatarDir, filename);

  await sharp(buffer)
    .resize(AVATAR_SIZE_PX, AVATAR_SIZE_PX, { fit: 'cover' })
    .webp({ quality: 85 })
    .toFile(dest);

  return filename;
}

/** Entfernt die Avatar-Datei, falls vorhanden (idempotent). */
export function removeAvatarFile(avatarDir: string, filename: string | null | undefined): void {
  if (!filename) return;
  fs.rmSync(path.join(avatarDir, filename), { force: true });
}
