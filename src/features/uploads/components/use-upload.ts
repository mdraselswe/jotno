"use client";

import { useState } from "react";
import type { MessageKey } from "@/i18n";
import { supabaseBrowser } from "@/infrastructure/supabase/browser";
import { compressImage } from "../compress";
import type { UploadKind } from "../kinds";
import { requestUpload } from "../server/actions";

/** Compress → ask the server for a ticket → upload straight to storage. Resolves to the stored path. */
export function useUpload(kind: UploadKind) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);

  async function upload(original: File): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      const file = await compressImage(original);
      const result = await requestUpload(kind, file.type, file.size);
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      const { error: upErr } = await supabaseBrowser()
        .storage.from(result.bucket)
        .uploadToSignedUrl(result.ticket.path, result.ticket.token, file, { contentType: file.type });
      if (upErr) {
        setError("common.genericError");
        return null;
      }
      return result.ticket.path;
    } finally {
      setBusy(false);
    }
  }

  return { upload, busy, error };
}
