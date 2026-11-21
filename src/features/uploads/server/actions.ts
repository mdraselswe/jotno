"use server";

import { actionViewer } from "@/features/auth/server";
import { rateLimit } from "@/infrastructure/db/helpers";
import { storage, type UploadTicket } from "@/infrastructure/storage";
import { extFor, UPLOAD_KINDS, type UploadKind } from "../kinds";

export type TicketResult =
  | { ok: true; ticket: UploadTicket; bucket: "media" | "private" }
  | {
      ok: false;
      error:
        | "common.signInFirst"
        | "common.fileType"
        | "common.fileTooBig"
        | "common.tooMany"
        | "common.genericError";
    };

/** A one-time signed upload URL for the browser (the file never passes through our server). */
export async function requestUpload(kind: UploadKind, type: string, size: number): Promise<TicketResult> {
  const viewer = await actionViewer();
  if (!viewer) return { ok: false, error: "common.signInFirst" };
  const spec = UPLOAD_KINDS[kind];
  const ext = extFor(type);
  if (!ext || !(spec.types as readonly string[]).includes(type))
    return { ok: false, error: "common.fileType" };
  if (size > storage.maxBytes(spec.bucket)) return { ok: false, error: "common.fileTooBig" };
  if (!(await rateLimit(`upload:${viewer.id}`, 60, 60 * 60))) return { ok: false, error: "common.tooMany" };
  try {
    const ticket = await storage.createUpload(
      spec.bucket,
      `${kind}/${viewer.id}/${crypto.randomUUID()}.${ext}`,
    );
    return { ok: true, ticket, bucket: spec.bucket };
  } catch {
    return { ok: false, error: "common.genericError" };
  }
}
