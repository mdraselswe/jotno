/**
 * What can be uploaded, where it goes, and who may use the path afterwards.
 * Paths are `<kind>/<userId>/<random>.<ext>`: a save action accepts a path
 * only if it starts with the viewer's own prefix (see ownsUpload).
 */
export const UPLOAD_KINDS = {
  pet: { bucket: "media", types: ["image/jpeg", "image/png", "image/webp"] },
  avatar: { bucket: "media", types: ["image/jpeg", "image/png", "image/webp"] },
  vetPhoto: { bucket: "media", types: ["image/jpeg", "image/png", "image/webp"] },
  question: { bucket: "media", types: ["image/jpeg", "image/png", "image/webp"] },
  product: { bucket: "media", types: ["image/jpeg", "image/png", "image/webp"] },
  vetDoc: { bucket: "private", types: ["image/jpeg", "image/png", "image/webp", "application/pdf"] },
  chat: { bucket: "private", types: ["image/jpeg", "image/png", "image/webp"] },
} as const;

export type UploadKind = keyof typeof UPLOAD_KINDS;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const extFor = (type: string) => EXT[type] ?? null;

/** Was this path created for this user and kind? (Never trust a path from the browser otherwise.) */
export function ownsUpload(path: string | null | undefined, kind: UploadKind, userId: string): boolean {
  if (!path) return false;
  return new RegExp(String.raw`^${kind}/${userId}/[a-z0-9-]+\.(jpg|png|webp|pdf)$`).test(path);
}
