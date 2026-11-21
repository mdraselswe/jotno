import "server-only";
import { publicEnv } from "@/config/env";
import { supabaseAdmin } from "@/infrastructure/supabase/server";

/**
 * File storage behind one small interface (Supabase Storage today; R2 later
 * means changing only this folder).
 *
 * - `media` (public): pet and vet photos, Q&A and product images. Served by URL.
 * - `private` : vet documents and chat images. Read through short signed URLs.
 *
 * Uploads go browser → storage directly with a one-time signed upload URL, so
 * the file never passes through our server (Workers have small body limits).
 */
export type Bucket = "media" | "private";

export interface UploadTicket {
  path: string;
  token: string;
  signedUrl: string;
}

const MAX_MB: Record<Bucket, number> = { media: 5, private: 10 };

export const storage = {
  maxBytes: (bucket: Bucket) => MAX_MB[bucket] * 1024 * 1024,

  async createUpload(bucket: Bucket, path: string): Promise<UploadTicket> {
    const { data, error } = await supabaseAdmin().storage.from(bucket).createSignedUploadUrl(path);
    if (error) throw error;
    return { path: data.path, token: data.token, signedUrl: data.signedUrl };
  },

  /** Public URL of a `media` file (no request needed). */
  publicUrl(path: string): string {
    return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  },

  /** Short-lived URL for a `private` file. */
  async signedUrl(path: string, seconds = 300): Promise<string> {
    const { data, error } = await supabaseAdmin().storage.from("private").createSignedUrl(path, seconds);
    if (error) throw error;
    return data.signedUrl;
  },

  async exists(bucket: Bucket, path: string): Promise<boolean> {
    const dir = path.split("/").slice(0, -1).join("/");
    const name = path.split("/").pop() ?? "";
    const { data } = await supabaseAdmin().storage.from(bucket).list(dir, { search: name, limit: 1 });
    return (data ?? []).some((f) => f.name === name);
  },

  async remove(bucket: Bucket, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    await supabaseAdmin().storage.from(bucket).remove(paths);
  },
};

/** A public media URL, or null. Safe to call from server components. */
export const mediaUrl = (path: string | null | undefined) => (path ? storage.publicUrl(path) : null);
