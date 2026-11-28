/* Service worker. Generated from scripts/sw.template.js by scripts/generate-assets.ts
   (and, in static mode, scripts/postbuild.ts); do not edit public/sw.js or out/sw.js. */
const VERSION = "__VERSION__";
const PRECACHE = __PRECACHE__;
/**
 * Paths that belong to one signed-in person (site.privatePaths, with and
 * without each locale prefix). They are never cached, so a shared device
 * can't show someone else's account offline or after sign-out.
 */
const PRIVATE = __PRIVATE__;
const CACHE = `site-${VERSION}`;
/** How long a page request may take before the cached copy is shown. */
const NETWORK_TIMEOUT_MS = 3500;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith("site-") && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** The page calls clearOfflineCache() (src/features/pwa) on sign-out. */
self.addEventListener("message", (event) => {
  if (event.data?.type === "clear-cache") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith("site-")).map((k) => caches.delete(k)))),
    );
  }
});

const isPrivate = (url) =>
  PRIVATE.some((p) => url.pathname === p || url.pathname.startsWith(p.endsWith("/") ? p : `${p}/`));

const isImmutable = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/images/") ||
  /\.(png|svg|webp|woff2?)$/.test(url.pathname);

/** Router payloads: `?_rsc=` varies per build, the file does not. */
const isRouterData = (url, request) => url.pathname.endsWith(".txt") || request.headers.get("RSC") === "1";

/** Only shared, public responses are stored: never `no-store` / `private` ones or anything behind a cookie login. */
function cacheable(response) {
  if (!response.ok || response.type !== "basic") return false;
  const control = response.headers.get("Cache-Control") ?? "";
  return !/\b(no-store|private)\b/i.test(control);
}

/**
 * Exact match only. Matching "ignoring the query" would hand back another
 * page's copy: /questions/?species=dog would get the cat list, and a
 * filtered router payload the unfiltered one.
 */
async function fromCache(request) {
  const cache = await caches.open(CACHE);
  return cache.match(request);
}

async function store(request, response) {
  if (cacheable(response)) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

/** Pages: fresh from the network when it answers quickly, otherwise the saved copy. */
async function page(request) {
  const network = fetch(request).then((res) => store(request, res));
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT_MS));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch {
    /* offline: fall through to the cache */
  }
  const cached = await fromCache(request);
  if (cached) return cached;
  try {
    return await network;
  } catch {
    return (await fromCache(new Request("/"))) ?? Response.error();
  }
}

/**
 * How long a file (script, style, image) or a page's router data may take to
 * start answering before it is asked for again. On some networks the host's
 * HTTP/3 stalls a single request for ~45 s while the others arrive; a second
 * try usually comes back at once. Only the wait for the first byte counts, so
 * a big image on a slow connection is never cut off mid-download.
 */
const ASSET_TIMEOUT_MS = 8000;
const DATA_TIMEOUT_MS = 10000;
/** src/lib/client-issue.ts: what went wrong reaches the server log. */
const ISSUE_PATH = "/api/client-issue/";
let issuesSent = 0;

function reportIssue(kind, request, started, detail) {
  if (issuesSent >= 10 || self.navigator.onLine === false) return;
  issuesSent += 1;
  const url = new URL(request.url);
  const body = JSON.stringify({ kind, path: url.pathname, ms: Date.now() - started, detail });
  fetch(ISSUE_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** Fetch; if no answer comes within `timeoutMs`, give up on that try and ask once more. */
async function fetchWithRetry(request, timeoutMs) {
  const started = Date.now();
  const attempt = (limit) => {
    const own = new AbortController();
    const signal =
      typeof AbortSignal.any === "function" ? AbortSignal.any([request.signal, own.signal]) : own.signal;
    const timer = limit ? setTimeout(() => own.abort(), limit) : 0;
    return fetch(request, { signal }).finally(() => clearTimeout(timer));
  };
  try {
    return await attempt(timeoutMs);
  } catch (error) {
    // The page itself gave up (a cancelled prefetch) or the device is offline: don't ask again.
    if (request.signal.aborted || self.navigator.onLine === false) throw error;
    try {
      const response = await attempt(0);
      reportIssue("asset-retry", request, started);
      return response;
    } catch (again) {
      if (!request.signal.aborted)
        reportIssue("asset-failed", request, started, String(again?.message ?? again));
      throw again;
    }
  }
}

async function cacheFirst(request) {
  return (await fromCache(request)) ?? store(request, await fetchWithRetry(request, ASSET_TIMEOUT_MS));
}

/**
 * Router data (client navigations, prefetches): always fresh from the
 * network, so filters, lists and prices are never stale; the saved copy is
 * only for when the network fails.
 */
async function networkFirst(request) {
  try {
    return await store(request, await fetchWithRetry(request, DATA_TIMEOUT_MS));
  } catch {
    return (await fromCache(request)) ?? Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // maps embed, fonts CDN etc. stay online-only
  if (request.headers.has("Authorization")) return;

  // Private pages and their router data: network only. Offline, a navigation shows the home page.
  if (isPrivate(url)) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request).catch(async () => (await fromCache(new Request("/"))) ?? Response.error()),
      );
    }
    return;
  }

  if (request.mode === "navigate") event.respondWith(page(request));
  else if (isImmutable(url)) event.respondWith(cacheFirst(request));
  else if (isRouterData(url, request)) event.respondWith(networkFirst(request));
  else event.respondWith(fetch(request).catch(async () => (await fromCache(request)) ?? Response.error()));
});

// Web push (Jotno): a vet replied, a vaccine is due, a booking is close, someone is calling.
// Payload: { title, body, url, tag, kind?, callId?, locale?, actions? }. kind "call"
// rings like a phone call: stays until tapped, vibrates, Answer / Decline buttons.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Jotno", body: event.data ? event.data.text() : "" };
  }
  const call = data.kind === "call";
  const options = {
    body: data.body || "",
    tag: data.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/", callId: call ? data.callId : undefined, locale: data.locale },
  };
  if (call) {
    options.requireInteraction = true;
    options.renotify = Boolean(data.tag);
    options.vibrate = [600, 300, 600, 300, 600, 300, 600];
    if (data.actions) {
      options.actions = [
        { action: "answer", title: data.actions.answer },
        { action: "decline", title: data.actions.decline },
      ];
    }
  }
  event.waitUntil(self.registration.showNotification(data.title || "Jotno", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { url: path, callId, locale } = event.notification.data || {};
  if (event.action === "decline" && callId) {
    event.waitUntil(
      fetch("/api/calls/decline/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, locale }),
      }).catch(() => undefined),
    );
    return;
  }
  const url = new URL(path || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (list) => {
      const open = list.find((c) => c.url === url);
      if (open) return open.focus();
      // A call: reuse a Jotno tab that's already open instead of opening another one.
      const tab = callId ? list.find((c) => "navigate" in c) : undefined;
      if (tab) {
        try {
          await tab.focus();
          return await tab.navigate(url);
        } catch {
          // Not controlled by this worker: open a new window below.
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
