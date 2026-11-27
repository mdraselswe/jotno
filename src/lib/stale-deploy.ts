/**
 * Errors that mean this tab runs an older build than the server: after a
 * deploy its JavaScript chunks are gone ("ChunkLoadError", "Failed to fetch
 * dynamically imported module") or its server actions have new ids ("Server
 * Action … was not found"). A full reload fixes them, so the error page
 * reloads once instead of showing "Something went wrong".
 */
const STALE =
  /ChunkLoadError|Loading (?:CSS )?chunk [\w-]+ failed|Failed to load chunk|dynamically imported module|Importing a module script failed|Server Action .* was not found|failed-to-find-server-action/i;

export function isStaleDeployError(error: unknown): boolean {
  if (error instanceof Error) return STALE.test(`${error.name} ${error.message}`);
  return typeof error === "string" && STALE.test(error);
}

/** Reload at most once per 30 seconds, so a real outage still shows the error page. */
export const STALE_RELOAD_KEY = "jotno:stale-reload";
export const STALE_RELOAD_GAP_MS = 30_000;
